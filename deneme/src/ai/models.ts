import type { BinaryMask } from './objectTools';
import type { ModelMessage, ModelRequest } from './models.worker';

type Report = (message: string, progress: number) => void;
type Distribute<T> = T extends unknown ? Omit<T, 'id'> : never;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (m: ModelMessage) => void; reject: (e: Error) => void; report: Report }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./models.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<ModelMessage>) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.type === 'progress') return job.report(data.message, data.progress);
      pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.message));
      else job.resolve(data);
    };
  }
  return worker;
}

function request(message: Distribute<ModelRequest>, report: Report, transfer: Transferable[] = []): Promise<ModelMessage> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, report });
    getWorker().postMessage({ ...message, id }, transfer);
  });
}

// Language pairs with a dedicated translation model (Helsinki-NLP opus-mt); others use NLLB.
const OPUS_PAIRS = new Set(['tr-en', 'en-de', 'en-es', 'en-fr', 'de-en', 'es-en', 'fr-en']);
const NLLB_CODES: Record<string, string> = {
  tr: 'tur_Latn',
  en: 'eng_Latn',
  de: 'deu_Latn',
  fr: 'fra_Latn',
  es: 'spa_Latn',
  ar: 'arb_Arab',
  ru: 'rus_Cyrl',
  it: 'ita_Latn',
  pt: 'por_Latn',
};
export const TRANSLATION_LANGUAGES = [
  { id: 'tr', label: 'Turkish' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'German' },
  { id: 'fr', label: 'French' },
  { id: 'es', label: 'Spanish' },
  { id: 'ar', label: 'Arabic' },
  { id: 'ru', label: 'Russian' },
  { id: 'it', label: 'Italian' },
  { id: 'pt', label: 'Portuguese' },
];

export function translationModel(src: string, tgt: string) {
  const pair = `${src}-${tgt}`;
  if (OPUS_PAIRS.has(pair)) return { model: `Xenova/opus-mt-${pair}`, size: '~110 MB' };
  return { model: 'Xenova/nllb-200-distilled-600M', size: '~600 MB', src: NLLB_CODES[src], tgt: NLLB_CODES[tgt] };
}

export async function translateTexts(texts: string[], src: string, tgt: string, report: Report): Promise<string[]> {
  const { model, src: srcCode, tgt: tgtCode } = translationModel(src, tgt);
  const result = await request({ type: 'translate', model, texts, src: srcCode, tgt: tgtCode }, report);
  return result.type === 'translated' ? result.texts : texts;
}

export const TTS_VOICES = [
  { id: 'eng', label: 'English' },
  { id: 'deu', label: 'German' },
  { id: 'fra', label: 'French' },
  { id: 'spa', label: 'Spanish' },
  { id: 'por', label: 'Portuguese' },
  { id: 'rus', label: 'Russian' },
  { id: 'ara', label: 'Arabic' },
  { id: 'kor', label: 'Korean' },
  { id: 'hin', label: 'Hindi' },
  { id: 'vie', label: 'Vietnamese' },
  { id: 'ron', label: 'Romanian' },
];

export async function synthesize(text: string, voice: string, report: Report): Promise<{ audio: Float32Array; sampleRate: number }> {
  const result = await request({ type: 'tts', model: `Xenova/mms-tts-${voice}`, text }, report);
  if (result.type !== 'speech') throw new Error('Could not generate speech');
  return { audio: result.audio, sampleRate: result.sampleRate };
}

// Separates any object from the background with BiRefNet; 1 = foreground.
export async function matteImage(image: ImageData, report: Report): Promise<BinaryMask> {
  const result = await request({ type: 'matting', image }, report);
  if (result.type !== 'matte') throw new Error('Could not generate mask');
  const data = new Uint8Array(image.width * image.height);
  // If the model output differs in size from the image, scale it with nearest neighbor.
  for (let y = 0; y < image.height; y++) {
    const sy = Math.floor((y * result.height) / image.height);
    for (let x = 0; x < image.width; x++) {
      const sx = Math.floor((x * result.width) / image.width);
      data[y * image.width + x] = result.mask[sy * result.width + sx] > 127 ? 1 : 0;
    }
  }
  return { data, width: image.width, height: image.height };
}
