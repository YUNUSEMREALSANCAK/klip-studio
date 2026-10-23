/// <reference lib="webworker" />
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

export interface WhisperRequest {
  audio: Float32Array; // 16 kHz mono
  model: string;
  language: string | null;
}

export type WhisperMessage =
  | { type: 'progress'; message: string; progress: number }
  | { type: 'result'; words: { text: string; start: number; end: number }[]; wordLevel: boolean }
  | { type: 'error'; message: string };

interface Chunk {
  text: string;
  timestamp: [number, number | null];
}

const post = (message: WhisperMessage) => self.postMessage(message);
const hasWebGpu = 'gpu' in navigator;

let loaded: { model: string; transcriber: AutomaticSpeechRecognitionPipeline } | null = null;

async function load(model: string) {
  if (loaded?.model === model) return loaded.transcriber;
  const files = new Map<string, number>();
  const transcriber = (await pipeline('automatic-speech-recognition', model, {
    device: hasWebGpu ? 'webgpu' : 'wasm',
    dtype: hasWebGpu ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
    progress_callback: (info: { status: string; file?: string; progress?: number }) => {
      if (info.status !== 'progress' || !info.file) return;
      files.set(info.file, info.progress ?? 0);
      const average = [...files.values()].reduce((a, b) => a + b, 0) / files.size;
      post({ type: 'progress', message: 'Model indiriliyor', progress: average / 100 });
    },
  })) as AutomaticSpeechRecognitionPipeline;
  loaded = { model, transcriber };
  return transcriber;
}

// Segment düzeyindeki zamanları kelimelere eşit dağıtır (kelime zamanı desteklenmezse).
function spreadWords(chunks: Chunk[], total: number) {
  return chunks.flatMap(({ text, timestamp: [start, end] }) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const stop = end ?? total;
    const step = (stop - start) / Math.max(words.length, 1);
    return words.map((word, i) => ({ text: word, start: start + i * step, end: start + (i + 1) * step }));
  });
}

self.onmessage = async ({ data }: MessageEvent<WhisperRequest>) => {
  try {
    const transcriber = await load(data.model);
    post({ type: 'progress', message: 'Konuşma metne çevriliyor', progress: -1 });
    const total = data.audio.length / 16000;
    const options = {
      language: data.language ?? undefined,
      task: 'transcribe' as const,
      chunk_length_s: 30,
      stride_length_s: 5,
    };
    try {
      const output = (await transcriber(data.audio, { ...options, return_timestamps: 'word' })) as { chunks?: Chunk[] };
      const words = (output.chunks ?? []).map(({ text, timestamp: [start, end] }) => ({
        text: text.trim(),
        start,
        end: end ?? start + 0.3,
      }));
      post({ type: 'result', words: words.filter((w) => w.text), wordLevel: true });
    } catch {
      // Bazı modeller kelime zamanını desteklemez; cümle zamanına düş.
      const output = (await transcriber(data.audio, { ...options, return_timestamps: true })) as { chunks?: Chunk[] };
      post({ type: 'result', words: spreadWords(output.chunks ?? [], total), wordLevel: false });
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
