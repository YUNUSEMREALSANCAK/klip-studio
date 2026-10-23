#!/usr/bin/env node
// Klip Studio MCP server: lets agents such as Claude drive the editor open in a browser.
// Agent ⇄ (stdio, MCP) ⇄ this server ⇄ (WebSocket :5299) ⇄ editor in the browser
// In the editor, Project settings → "Agent connection" must be on (or open the URL with ?bridge).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

const PORT = Number(process.env.KLIP_BRIDGE_PORT ?? 5299);
const TIMEOUT_MS = 15 * 60 * 1000; // AI tools can take minutes
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
};

let page = null;
let nextId = 1;
const pending = new Map();

const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
wss.on('connection', (socket) => {
  page = socket;
  console.error(`[klip-mcp] editor connected`);
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
    return Promise.reject(new Error(`Not connected to Klip Studio. Open the editor and enable "Agent connection" in project settings (port ${PORT}).`));
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

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const guard = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (error) {
    return { ...text(`Hata: ${error.message}`), isError: true };
  }
};

const server = new McpServer({ name: 'klip-studio', version: '0.1.0' });

server.registerTool(
  'klip_state',
  { description: 'Summary of the open project: assets (id), clips (id, track, start, duration), total duration, aspect ratio, playhead.' },
  guard(async () => text(await call('execute', { name: 'get_state' }))),
);

server.registerTool(
  'klip_commands',
  { description: 'Name, description and parameter schema of every command klip_execute can run.' },
  guard(async () => text(await call('commands'))),
);

server.registerTool(
  'klip_execute',
  {
    description:
      'Runs a command in the editor. Examples: {"name":"split","time":3.2}, {"name":"add_text","text":"Hello"}, {"name":"run_ai","tool":"captions","options":{"language":"english"}}. See klip_commands for the full list.',
    inputSchema: { command: z.object({ name: z.string() }).passthrough().describe('Command object; the "name" field is required') },
  },
  guard(async ({ command }) => text((await call('execute', command)) ?? { ok: true })),
);

server.registerTool(
  'klip_screenshot',
  { description: 'Returns the current preview frame as a JPEG (to check the result).' },
  guard(async () => {
    const dataUrl = await call('screenshot');
    return { content: [{ type: 'image', data: dataUrl.split(',')[1], mimeType: 'image/jpeg' }] };
  }),
);

server.registerTool(
  'klip_import_file',
  {
    description: 'Adds a local video, audio or image file to the editor media library; returns the assetId.',
    inputSchema: { path: z.string().describe('Absolute file path') },
  },
  guard(async ({ path: file }) => {
    const data = await readFile(file);
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) throw new Error(`Unsupported file type: ${path.extname(file)}`);
    return text(await call('import', { name: path.basename(file), type, base64: data.toString('base64') }));
  }),
);

await server.connect(new StdioServerTransport());
console.error(`[klip-mcp] ready; listening for the editor on ws://127.0.0.1:${PORT}`);
