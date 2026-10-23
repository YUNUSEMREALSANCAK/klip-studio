#!/usr/bin/env node
// Klip Stüdyo MCP sunucusu: Claude gibi ajanların tarayıcıda açık editörü sürmesini sağlar.
// Ajan ⇄ (stdio, MCP) ⇄ bu sunucu ⇄ (WebSocket :5299) ⇄ tarayıcıdaki editör
// Editörde Proje ayarları → "Ajan bağlantısı" açık olmalı (veya adres ?bridge ile açılmalı).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

const PORT = Number(process.env.KLIP_BRIDGE_PORT ?? 5299);
const TIMEOUT_MS = 15 * 60 * 1000; // yapay zeka araçları dakikalar sürebilir
const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

let page = null;
let nextId = 1;
const pending = new Map();

const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
wss.on('connection', (socket) => {
  page = socket;
  console.error(`[klip-mcp] editör bağlandı`);
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
    return Promise.reject(new Error(`Klip Stüdyo'ya bağlı değil. Editörü açın ve Proje ayarlarında "Ajan bağlantısı"nı açın (port ${PORT}).`));
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Editör yanıt vermedi (zaman aşımı)'));
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
  { description: 'Açık projenin özeti: varlıklar (id), klipler (id, iz, başlangıç, süre), toplam süre, oran, oynatma çizgisi.' },
  guard(async () => text(await call('execute', { name: 'get_state' }))),
);

server.registerTool(
  'klip_commands',
  { description: 'klip_execute ile çalıştırılabilecek tüm komutların adı, açıklaması ve parametre şeması.' },
  guard(async () => text(await call('commands'))),
);

server.registerTool(
  'klip_execute',
  {
    description:
      'Editörde bir komut çalıştırır. Örnek: {"name":"split","time":3.2}, {"name":"add_text","text":"Merhaba"}, {"name":"run_ai","tool":"captions","options":{"language":"turkish"}}. Tüm liste için klip_commands.',
    inputSchema: { command: z.object({ name: z.string() }).passthrough().describe('Komut nesnesi; "name" alanı zorunlu') },
  },
  guard(async ({ command }) => text((await call('execute', command)) ?? { ok: true })),
);

server.registerTool(
  'klip_screenshot',
  { description: 'Önizlemenin o anki karesini JPEG olarak döndürür (sonucu görmek için).' },
  guard(async () => {
    const dataUrl = await call('screenshot');
    return { content: [{ type: 'image', data: dataUrl.split(',')[1], mimeType: 'image/jpeg' }] };
  }),
);

server.registerTool(
  'klip_import_file',
  {
    description: 'Bilgisayardaki bir video, ses veya görsel dosyasını editörün medya kütüphanesine ekler; assetId döner.',
    inputSchema: { path: z.string().describe('Dosyanın tam yolu') },
  },
  guard(async ({ path: file }) => {
    const data = await readFile(file);
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) throw new Error(`Desteklenmeyen dosya türü: ${path.extname(file)}`);
    return text(await call('import', { name: path.basename(file), type, base64: data.toString('base64') }));
  }),
);

await server.connect(new StdioServerTransport());
console.error(`[klip-mcp] hazır; editör için ws://127.0.0.1:${PORT} dinleniyor`);
