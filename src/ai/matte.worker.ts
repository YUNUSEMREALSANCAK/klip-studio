/// <reference lib="webworker" />
import type { FilesetResolver } from '@mediapipe/tasks-vision';
import { createSelfieSegmenter, segmentFrame } from './segmenter';

// Dışa aktarmada kişi ayırma; ana iş parçacığını meşgul etmez.
export type MatteRequest = { id: number; frame: ImageBitmap };
export type MatteMessage = { id: number; mask?: Uint8Array; width?: number; height?: number; error?: string };

const work = new OffscreenCanvas(1, 1);
const BASE = `${import.meta.env.BASE_URL}mediapipe-wasm`;

// Modül yükleyicisi Blob adresinden içe aktarılır: Vite'ın geliştirme sunucusu public/ içindeki
// dosyaların doğrudan modül olarak içe aktarılmasına izin vermez.
async function moduleFileset(): Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> {
  const source = await (await fetch(`${BASE}/vision_wasm_module_internal.js`)).text();
  return {
    wasmLoaderPath: URL.createObjectURL(new Blob([source], { type: 'text/javascript' })),
    wasmBinaryPath: new URL(`${BASE}/vision_wasm_module_internal.wasm`, self.location.href).href,
  };
}

const segmenter = moduleFileset().then((files) => createSelfieSegmenter(files, new OffscreenCanvas(1, 1)));
let clock = 0;

self.onmessage = async ({ data }: MessageEvent<MatteRequest>) => {
  try {
    const mask = segmentFrame(await segmenter, work, data.frame, data.frame.width, data.frame.height, (clock += 33));
    data.frame.close();
    const message: MatteMessage = { id: data.id, ...mask, mask: mask.data };
    self.postMessage(message, { transfer: [mask.data.buffer] });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) } satisfies MatteMessage);
  }
};
