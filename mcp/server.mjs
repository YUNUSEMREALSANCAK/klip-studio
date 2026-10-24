#!/usr/bin/env node
// Klip Studio MCP server: lets AI apps (Claude Desktop, Claude Code, Cursor, Codex, …) drive the editor open in a browser.
// AI app ⇄ (stdio or Streamable HTTP, MCP) ⇄ this server ⇄ (WebSocket :5299) ⇄ editor in the browser
// In the editor, the Project panel → "Agent connection (MCP)" must be on (or open the URL with ?bridge).
//
// Usage: klip-studio-mcp            stdio, started by the AI app
//        klip-studio-mcp --http     one shared server at http://127.0.0.1:5300/mcp for several apps

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

const VERSION = '0.2.0';
const HTTP = process.argv.includes('--http');
const BRIDGE_PORT = Number(process.env.KLIP_BRIDGE_PORT ?? 5299);
const HTTP_PORT = Number(process.env.KLIP_MCP_PORT ?? 5300);
const TIMEOUT_MS = 15 * 60 * 1000; // AI tools and exports can take minutes
const MIME = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Only the editor may connect: a local dev server, the live demo, or origins listed in KLIP_ALLOWED_ORIGINS.
// Without this check any website open in the browser could pose as the editor and receive imported files.
const ALLOWED_ORIGINS = ['https://yunusemrealsancak.github.io', ...(process.env.KLIP_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)];
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const originAllowed = (origin) => {
  if (!origin) return false;
  try {
    const { host, protocol } = new URL(origin);
    return ((protocol === 'http:' || protocol === 'https:') && LOCAL_HOST.test(host)) || ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
};

const log = (message) => console.error(`[klip-mcp] ${message}`);

function exitOnPortClash(port, hint) {
  return (error) => {
    if (error.code !== 'EADDRINUSE') throw error;
    log(`Port ${port} is already in use (another Klip Studio MCP server is probably running). ${hint}`);
    process.exit(1);
  };
}

// --- Bridge to the editor -------------------------------------------------

let page = null;
let nextId = 1;
const pending = new Map();

const wss = new WebSocketServer({
  port: BRIDGE_PORT,
  host: '127.0.0.1',
  maxPayload: 1024 * 1024 * 1024,
  verifyClient: ({ origin }) => originAllowed(origin),
});
wss.on('error', exitOnPortClash(BRIDGE_PORT, 'To use several AI apps at once, run one shared server with --http and point the apps at its URL.'));
wss.on('connection', (socket) => {
  page = socket;
  log('editor connected');
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    const job = pending.get(message.id);
    if (!job) return;
    pending.delete(message.id);
    clearTimeout(job.timer);
    if (message.error) job.reject(new Error(message.error));
    else job.resolve(message.result);
  });
  socket.on('close', () => {
    if (page === socket) page = null;
  });
});

function call(method, params) {
  if (!page) {
    return Promise.reject(
      new Error(`Not connected to Klip Studio. Open the editor and turn on "Agent connection (MCP)" in the Project panel (port ${BRIDGE_PORT}).`),
    );
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('The editor did not respond (timeout)'));
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    page.send(JSON.stringify({ id, method, params }));
  });
}

// --- MCP tools ------------------------------------------------------------

const INSTRUCTIONS = `Klip Studio is a video editor running in the user's browser; these tools edit the open project.
Call klip_state first: clip and asset IDs come from it, never invent them. Times are in seconds.
Use klip_commands for the full command list, klip_screenshot to check visual changes, and klip_export to save the result as an MP4.
When the user describes a transition or filter that isn't built in, write it in GLSL with the create_effect command (see klip_commands
for the API), apply it with set_transition {effectId} or set_filter, then seek into it and check it with klip_screenshot.
Every edit is undoable ({"name":"undo"}).`;

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const guard = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (error) {
    return { ...text(`Error: ${error.message}`), isError: true };
  }
};
const readOnly = { readOnlyHint: true, openWorldHint: false };

function buildServer() {
  const server = new McpServer({ name: 'klip-studio', title: 'Klip Studio', version: VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'klip_state',
    {
      title: 'Project state',
      description: 'Summary of the open project: assets (id), clips (id, track, start, duration), total duration, aspect ratio, playhead.',
      annotations: readOnly,
    },
    guard(async () => text(await call('execute', { name: 'get_state' }))),
  );

  server.registerTool(
    'klip_commands',
    { title: 'List commands', description: 'Name, description and parameter schema of every command klip_execute can run.', annotations: readOnly },
    guard(async () => text(await call('commands'))),
  );

  server.registerTool(
    'klip_execute',
    {
      title: 'Run an editor command',
      description:
        'Runs a command in the editor. Examples: {"name":"split","time":3.2}, {"name":"add_text","text":"Hello"}, {"name":"run_ai","tool":"captions","options":{"language":"english"}}, {"name":"create_effect","kind":"filter","title":"Duotone","code":"vec4 effect(vec4 color, vec2 uv) { ... }"}. See klip_commands for the full list and the GLSL API.',
      inputSchema: { command: z.object({ name: z.string() }).passthrough().describe('Command object; the "name" field is required') },
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    guard(async ({ command }) => text((await call('execute', command)) ?? { ok: true })),
  );

  server.registerTool(
    'klip_screenshot',
    { title: 'Preview screenshot', description: 'Returns the current preview frame as a JPEG (to check the result).', annotations: readOnly },
    guard(async () => {
      const dataUrl = await call('screenshot');
      return { content: [{ type: 'image', data: dataUrl.split(',')[1], mimeType: 'image/jpeg' }] };
    }),
  );

  server.registerTool(
    'klip_import_file',
    {
      title: 'Import a file',
      description:
        'Adds a local video, audio or image file to the media library (returns assetId), or a font file (.ttf, .otf, .woff, .woff2) to the project fonts (returns family).',
      inputSchema: { path: z.string().describe('Absolute file path') },
      annotations: { destructiveHint: false, openWorldHint: false },
    },
    guard(async ({ path: file }) => {
      const type = MIME[path.extname(file).toLowerCase()];
      if (!type) throw new Error(`Unsupported file type: ${path.extname(file)}`);
      const data = await readFile(file);
      return text(await call('import', { name: path.basename(file), type, base64: data.toString('base64') }));
    }),
  );

  server.registerTool(
    'klip_export',
    {
      title: 'Export MP4',
      description: 'Renders the timeline to an MP4 (H.264/AAC) and saves it to a local path. Takes about 10 s per minute of 1080p video.',
      inputSchema: {
        path: z.string().describe('Absolute output path ending in .mp4; an existing file is overwritten'),
        quality: z.enum(['1080p', '720p', '480p']).optional().describe('Default 1080p'),
        fps: z
          .union([z.literal(24), z.literal(30), z.literal(60)])
          .optional()
          .describe('Default: project frame rate'),
      },
      annotations: { destructiveHint: true, openWorldHint: false },
    },
    guard(async ({ path: file, quality, fps }) => {
      if (path.extname(file).toLowerCase() !== '.mp4') throw new Error('The output path must end in .mp4');
      const result = await call('export', { quality, fps });
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(result.base64, 'base64'));
      return text({ path: file, width: result.width, height: result.height, fps: result.fps, duration: result.duration, bytes: result.bytes });
    }),
  );

  return server;
}

// --- Transports -----------------------------------------------------------

if (!HTTP) {
  await buildServer().connect(new StdioServerTransport());
  log(`ready (stdio); waiting for the editor on ws://127.0.0.1:${BRIDGE_PORT}`);
} else {
  const sessions = new Map();
  const http = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== '/mcp') return void res.writeHead(404).end('Not found');
    // DNS rebinding protection: only local host names, and only allowed browser origins.
    if (!LOCAL_HOST.test(req.headers.host ?? '') || (req.headers.origin && !originAllowed(req.headers.origin))) {
      return void res.writeHead(403).end('Forbidden');
    }
    const sessionId = req.headers['mcp-session-id'];
    let transport = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined;
    if (sessionId && !transport) return void res.writeHead(404).end('Unknown session');
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (id) => sessions.set(id, transport),
      });
      transport.onclose = () => transport.sessionId && sessions.delete(transport.sessionId);
      await buildServer().connect(transport);
    }
    await transport.handleRequest(req, res);
  });
  http.on('error', exitOnPortClash(HTTP_PORT, 'Set KLIP_MCP_PORT to use another port.'));
  http.listen(HTTP_PORT, '127.0.0.1', () => {
    log(`ready at http://127.0.0.1:${HTTP_PORT}/mcp; waiting for the editor on ws://127.0.0.1:${BRIDGE_PORT}`);
  });
}
