/// <reference lib="webworker" />
import { pipeline, RawImage } from '@huggingface/transformers';

// Shared worker running the translation, text-to-speech and general background removal models.

export type ModelRequest =
  | { id: number; type: 'translate'; model: string; texts: string[]; src?: string; tgt?: string }
  | { id: number; type: 'tts'; model: string; text: string }
  | { id: number; type: 'matting'; image: ImageData };

export type ModelMessage =
  | { id: number; type: 'progress'; message: string; progress: number }
  | { id: number; type: 'translated'; texts: string[] }
  | { id: number; type: 'speech'; audio: Float32Array; sampleRate: number }
  | { id: number; type: 'matte'; mask: Uint8Array; width: number; height: number }
  | { id: number; type: 'error'; message: string };

// Best general model when the GPU can handle it; otherwise a light model that runs on the CPU.
const MATTING_MODEL = 'onnx-community/BiRefNet_lite-ONNX'; // MIT
const MATTING_MODEL_CPU = 'Xenova/modnet'; // Apache-2.0, fast on CPU; works best on people
const hasWebGpu = 'gpu' in navigator;
const post = (message: ModelMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer });

// Pipeline cache, loaded once per task and model
const pipelines = new Map<string, Promise<(...args: unknown[]) => Promise<unknown>>>();

function load(task: string, model: string, id: number, options: Record<string, unknown> = {}) {
  const key = `${task}:${model}`;
  if (!pipelines.has(key)) {
    const files = new Map<string, number>();
    pipelines.set(
      key,
      pipeline(task as never, model, {
        ...options,
        progress_callback: (info: { status: string; file?: string; progress?: number }) => {
          if (info.status !== 'progress' || !info.file) return;
          files.set(info.file, info.progress ?? 0);
          const average = [...files.values()].reduce((a, b) => a + b, 0) / files.size;
          post({ id, type: 'progress', message: 'Downloading model', progress: average / 100 });
        },
      }) as unknown as Promise<(...args: unknown[]) => Promise<unknown>>,
    );
  }
  return pipelines.get(key)!;
}

async function translate({ id, model, texts, src, tgt }: Extract<ModelRequest, { type: 'translate' }>) {
  const translator = await load('translation', model, id, { dtype: 'q8' });
  const out: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const result = (await translator(texts[i], src ? { src_lang: src, tgt_lang: tgt } : {})) as { translation_text: string }[];
    out.push(result[0]?.translation_text ?? texts[i]);
    post({ id, type: 'progress', message: 'Translating', progress: (i + 1) / texts.length });
  }
  post({ id, type: 'translated', texts: out });
}

async function speak({ id, model, text }: Extract<ModelRequest, { type: 'tts' }>) {
  const synthesizer = await load('text-to-speech', model, id, { dtype: 'q8' });
  post({ id, type: 'progress', message: 'Generating speech', progress: -1 });
  const result = (await synthesizer(text)) as { audio: Float32Array; sampling_rate: number };
  post({ id, type: 'speech', audio: result.audio, sampleRate: result.sampling_rate }, [result.audio.buffer]);
}

// BiRefNet uses 11 storage buffers in one shader; if the GPU can't, run straight on the CPU.
const gpuFitsMatting = (async () => {
  if (!hasWebGpu) return false;
  const adapter = await (
    navigator as unknown as { gpu: { requestAdapter(): Promise<{ limits: { maxStorageBuffersPerShaderStage: number } } | null> } }
  ).gpu.requestAdapter();
  return (adapter?.limits.maxStorageBuffersPerShaderStage ?? 0) >= 11;
})();
let mattingOnCpu: boolean | null = null;

async function matte({ id, image }: Extract<ModelRequest, { type: 'matting' }>) {
  const raw = new RawImage(new Uint8ClampedArray(image.data), image.width, image.height, 4);
  mattingOnCpu ??= !(await gpuFitsMatting);
  const run = async () => {
    const segmenter = mattingOnCpu
      ? await load('background-removal', MATTING_MODEL_CPU, id, { device: 'wasm' })
      : await load('background-removal', MATTING_MODEL, id, { device: 'webgpu', dtype: 'fp16' });
    post({ id, type: 'progress', message: 'Separating object', progress: -1 });
    const out = (await segmenter(raw)) as RawImage | RawImage[];
    // For a single image, returns an array or a single result depending on the version.
    return Array.isArray(out) ? out[0] : out;
  };
  let result: RawImage;
  try {
    result = await run();
  } catch (error) {
    // Some GPUs don't support the buffer count the model needs; retry on the CPU.
    if (mattingOnCpu) throw error;
    mattingOnCpu = true;
    result = await run();
  }
  // The result is RGBA; the alpha channel is the mask.
  const mask = new Uint8Array(result.width * result.height);
  for (let i = 0; i < mask.length; i++) mask[i] = result.data[i * result.channels + result.channels - 1];
  post({ id, type: 'matte', mask, width: result.width, height: result.height }, [mask.buffer]);
}

self.onmessage = async ({ data }: MessageEvent<ModelRequest>) => {
  try {
    if (data.type === 'translate') await translate(data);
    else if (data.type === 'tts') await speak(data);
    else await matte(data);
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
