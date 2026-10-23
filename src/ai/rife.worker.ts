/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
import { cachedModel } from './modelCache';

// RIFE 4.22 lite: generates a new frame between two frames at a given time using optical flow.
const MODEL_URL = 'https://huggingface.co/square-zero-labs/rife-onnx/resolve/main/rife422lite_fp32.onnx';

export type RifeRequest = { id: number; a: Uint8ClampedArray; b: Uint8ClampedArray; width: number; height: number; t: number };
export type RifeMessage =
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'result'; frame: Uint8ClampedArray }
  | { id: number; type: 'error'; message: string };

const post = (message: RifeMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer });

let session: Promise<ort.InferenceSession> | null = null;
let cpuOnly = false;
let grid: { key: string; tensor: ort.Tensor; div: ort.Tensor } | null = null;

const getSession = (id: number) =>
  (session ??= cachedModel(MODEL_URL, (progress) => post({ id, type: 'progress', progress })).then((bytes) =>
    ort.InferenceSession.create(bytes, { executionProviders: cpuOnly ? ['wasm'] : ['webgpu', 'wasm'] }),
  ));

// Helper tensors the model expects: a normalized sampling grid and flow divisors.
function gridFor(width: number, height: number) {
  const key = `${width}x${height}`;
  if (grid?.key !== key) {
    const data = new Float32Array(2 * width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[y * width + x] = -1 + (2 * x) / (width - 1);
        data[width * height + y * width + x] = -1 + (2 * y) / (height - 1);
      }
    }
    grid = {
      key,
      tensor: new ort.Tensor('float32', data, [1, 2, height, width]),
      div: new ort.Tensor('float32', new Float32Array([(width - 1) / 2, (height - 1) / 2]), [2]),
    };
  }
  return grid;
}

function toPlanar(rgba: Uint8ClampedArray, n: number) {
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = rgba[i * 4] / 255;
    out[n + i] = rgba[i * 4 + 1] / 255;
    out[2 * n + i] = rgba[i * 4 + 2] / 255;
  }
  return out;
}

async function interpolate(data: RifeRequest) {
  const { width, height } = data;
  const n = width * height;
  const g = gridFor(width, height);
  const feeds = {
    img0: new ort.Tensor('float32', toPlanar(data.a, n), [1, 3, height, width]),
    img1: new ort.Tensor('float32', toPlanar(data.b, n), [1, 3, height, width]),
    timestep: new ort.Tensor('float32', new Float32Array([data.t]), [1, 1, 1, 1]),
    tenFlow_div: g.div,
    backwarp_tenGrid: g.tensor,
  };
  try {
    return await (await getSession(data.id)).run(feeds);
  } catch (error) {
    // Some ops may fail on WebGPU; rebuild the session on the CPU.
    if (cpuOnly) throw error;
    cpuOnly = true;
    session = null;
    return (await getSession(data.id)).run(feeds);
  }
}

self.onmessage = async ({ data }: MessageEvent<RifeRequest>) => {
  try {
    const out = (await interpolate(data)).frame.data as Float32Array;
    const n = data.width * data.height;
    const frame = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      frame[i * 4] = out[i] * 255;
      frame[i * 4 + 1] = out[n + i] * 255;
      frame[i * 4 + 2] = out[2 * n + i] * 255;
      frame[i * 4 + 3] = 255;
    }
    post({ id: data.id, type: 'result', frame }, [frame.buffer]);
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
