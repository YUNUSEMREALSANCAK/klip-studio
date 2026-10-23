/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
import { cachedModel } from './modelCache';

// LaMa (big-lama, Apache-2.0) ile doldurma: 512×512 görsel + maske → doldurulmuş görsel.
const MODEL_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx';
export const LAMA_SIZE = 512;

export type LamaRequest = { id: number; image: Uint8ClampedArray; mask: Uint8Array }; // RGBA 512² · 0/1 512²
export type LamaMessage =
  | { id: number; type: 'progress'; message: string; progress: number }
  | { id: number; type: 'result'; image: Uint8ClampedArray }
  | { id: number; type: 'error'; message: string };

const post = (message: LamaMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer });

let session: Promise<ort.InferenceSession> | null = null;
let cpuOnly = false;

function getSession(id: number) {
  session ??= cachedModel(MODEL_URL, (progress) => post({ id, type: 'progress', message: 'LaMa modeli indiriliyor', progress })).then((bytes) =>
    ort.InferenceSession.create(bytes, { executionProviders: cpuOnly ? ['wasm'] : ['webgpu', 'wasm'] }),
  );
  return session;
}

// Modelin FFT dalındaki bazı işlemler WebGPU'da çalışmayabilir; o zaman oturum işlemcide yeniden kurulur.
async function runModel(id: number, feeds: Record<string, ort.Tensor>) {
  try {
    const model = await getSession(id);
    return { model, outputs: await model.run(feeds) };
  } catch (error) {
    if (cpuOnly) throw error;
    cpuOnly = true;
    session = null;
    post({ id, type: 'progress', message: 'İşlemcide yeniden deneniyor', progress: -1 });
    const model = await getSession(id);
    return { model, outputs: await model.run(feeds) };
  }
}

self.onmessage = async ({ data }: MessageEvent<LamaRequest>) => {
  try {
    const n = LAMA_SIZE * LAMA_SIZE;
    const image = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      image[i] = data.image[i * 4] / 255;
      image[n + i] = data.image[i * 4 + 1] / 255;
      image[2 * n + i] = data.image[i * 4 + 2] / 255;
    }
    const mask = Float32Array.from(data.mask, (v) => (v ? 1 : 0));
    const { model, outputs } = await runModel(data.id, {
      image: new ort.Tensor('float32', image, [1, 3, LAMA_SIZE, LAMA_SIZE]),
      mask: new ort.Tensor('float32', mask, [1, 1, LAMA_SIZE, LAMA_SIZE]),
    });
    const out = outputs[model.outputNames[0]].data as Float32Array; // 0..255, CHW
    const rgba = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      rgba[i * 4] = out[i];
      rgba[i * 4 + 1] = out[n + i];
      rgba[i * 4 + 2] = out[2 * n + i];
      rgba[i * 4 + 3] = 255;
    }
    post({ id: data.id, type: 'result', image: rgba }, [rgba.buffer]);
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
