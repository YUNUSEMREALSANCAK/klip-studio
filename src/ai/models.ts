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

// Doğrudan çevirmen modeli olan dil çiftleri (Helsinki-NLP opus-mt); diğerleri NLLB ile.
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
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'İngilizce' },
  { id: 'de', label: 'Almanca' },
  { id: 'fr', label: 'Fransızca' },
  { id: 'es', label: 'İspanyolca' },
  { id: 'ar', label: 'Arapça' },
  { id: 'ru', label: 'Rusça' },
  { id: 'it', label: 'İtalyanca' },
  { id: 'pt', label: 'Portekizce' },
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
  { id: 'eng', label: 'İngilizce' },
  { id: 'deu', label: 'Almanca' },
  { id: 'fra', label: 'Fransızca' },
  { id: 'spa', label: 'İspanyolca' },
  { id: 'por', label: 'Portekizce' },
  { id: 'rus', label: 'Rusça' },
  { id: 'ara', label: 'Arapça' },
  { id: 'kor', label: 'Korece' },
  { id: 'hin', label: 'Hintçe' },
  { id: 'vie', label: 'Vietnamca' },
  { id: 'ron', label: 'Rumence' },
];

export async function synthesize(text: string, voice: string, report: Report): Promise<{ audio: Float32Array; sampleRate: number }> {
  const result = await request({ type: 'tts', model: `Xenova/mms-tts-${voice}`, text }, report);
  if (result.type !== 'speech') throw new Error('Ses üretilemedi');
  return { audio: result.audio, sampleRate: result.sampleRate };
}

// BiRefNet ile herhangi bir nesneyi arka plandan ayırır; 1 = ön plan.
export async function matteImage(image: ImageData, report: Report): Promise<BinaryMask> {
  const result = await request({ type: 'matting', image }, report);
  if (result.type !== 'matte') throw new Error('Maske üretilemedi');
  const data = new Uint8Array(image.width * image.height);
  // Model çıktısı görselle aynı boyutta değilse en yakın komşu ile ölçekle.
  for (let y = 0; y < image.height; y++) {
    const sy = Math.floor((y * result.height) / image.height);
    for (let x = 0; x < image.width; x++) {
      const sx = Math.floor((x * result.width) / image.width);
      data[y * image.width + x] = result.mask[sy * result.width + sx] > 127 ? 1 : 0;
    }
  }
  return { data, width: image.width, height: image.height };
}
