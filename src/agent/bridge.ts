import { COMMAND_SPECS, execute, type Command } from '../core/commands';
import { useEditor } from '../core/store';
import { createAsset } from '../media/importMedia';

// Browser side for agents: the window.klip API and the WebSocket bridge to the MCP server.

export const BRIDGE_PORT = 5299;
const STORAGE_KEY = 'klip-bridge';

// The current preview image (video layer + text layer).
export function screenshot(quality = 0.85): string {
  const [gl, text] = document.querySelectorAll<HTMLCanvasElement>('.stage canvas');
  if (!gl) throw new Error('Preview not found');
  const canvas = document.createElement('canvas');
  canvas.width = gl.width;
  canvas.height = gl.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(gl, 0, 0);
  if (text) ctx.drawImage(text, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}

async function importBlob(blob: Blob, name: string) {
  const asset = await createAsset(blob, name);
  useEditor.getState().addAsset(asset);
  return { assetId: asset.id, kind: asset.kind, duration: Number.isFinite(asset.duration) ? asset.duration : null };
}

export async function importUrl(url: string, name = url.split('/').pop() || 'medya') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return importBlob(await response.blob(), name);
}

export interface KlipApi {
  commands: typeof COMMAND_SPECS;
  execute: (command: Command) => Promise<unknown>;
  state: () => Promise<unknown>;
  screenshot: () => string;
  importUrl: typeof importUrl;
}

export function installWindowApi() {
  const api: KlipApi = {
    commands: COMMAND_SPECS,
    execute,
    state: () => execute({ name: 'get_state' }),
    screenshot,
    importUrl,
  };
  (window as unknown as { klip: KlipApi }).klip = api;
}

type BridgeRequest =
  | { id: number; method: 'execute'; params: Command }
  | { id: number; method: 'screenshot' }
  | { id: number; method: 'import'; params: { name: string; type: string; base64: string } }
  | { id: number; method: 'commands' };

async function handle(request: BridgeRequest): Promise<unknown> {
  switch (request.method) {
    case 'execute':
      return execute(request.params);
    case 'screenshot':
      return screenshot();
    case 'commands':
      return COMMAND_SPECS;
    case 'import': {
      const bytes = Uint8Array.from(atob(request.params.base64), (c) => c.charCodeAt(0));
      return importBlob(new Blob([bytes], { type: request.params.type }), request.params.name);
    }
  }
}

export type BridgeStatus = 'off' | 'connecting' | 'connected';

let socket: WebSocket | null = null;
let retry = 0;
let listener: (status: BridgeStatus) => void = () => {};

export const bridgeEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1' || new URLSearchParams(location.search).has('bridge');
  } catch {
    return false;
  }
};

export function onBridgeStatus(callback: (status: BridgeStatus) => void) {
  listener = callback;
}

function connect() {
  listener('connecting');
  socket = new WebSocket(`ws://localhost:${BRIDGE_PORT}`);
  socket.onopen = () => listener('connected');
  socket.onmessage = async ({ data }) => {
    const request = JSON.parse(data) as BridgeRequest;
    try {
      socket?.send(JSON.stringify({ id: request.id, result: await handle(request) }));
    } catch (error) {
      socket?.send(JSON.stringify({ id: request.id, error: (error as Error).message }));
    }
  };
  socket.onclose = () => {
    socket = null;
    if (!bridgeEnabled()) return listener('off');
    listener('connecting');
    retry = window.setTimeout(connect, 3000);
  };
}

export function setBridgeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // If storage is unavailable, it applies to this session only.
  }
  window.clearTimeout(retry);
  if (enabled && !socket) connect();
  if (!enabled) {
    socket?.close();
    listener('off');
  }
}

export function startBridgeIfEnabled() {
  if (bridgeEnabled() && !socket) connect();
}
