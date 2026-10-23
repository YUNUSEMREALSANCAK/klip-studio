import type { Asset, Clip, Word } from '../core/types';
import { mixTimelineAudio, toMono } from '../media/audio';
import type { WhisperMessage, WhisperRequest } from './whisper.worker';

export const WHISPER_MODELS = [
  { id: 'onnx-community/whisper-tiny_timestamped', label: 'Tiny — en hızlı (~40 MB)' },
  { id: 'onnx-community/whisper-base_timestamped', label: 'Base — dengeli (~80 MB)' },
  { id: 'onnx-community/whisper-small_timestamped', label: 'Small — en doğru (~250 MB)' },
];

export const LANGUAGES = [
  { id: 'turkish', label: 'Türkçe' },
  { id: 'english', label: 'İngilizce' },
  { id: 'german', label: 'Almanca' },
  { id: 'french', label: 'Fransızca' },
  { id: 'spanish', label: 'İspanyolca' },
  { id: 'arabic', label: 'Arapça' },
  { id: 'auto', label: 'Otomatik algıla' },
];

let worker: Worker | null = null;
const getWorker = () => (worker ??= new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' }));

// Zaman çizelgesinin tüm sesini Whisper ile metne çevirir; kelime zamanları zaman çizelgesine göredir.
export async function transcribeTimeline(
  clips: Clip[],
  assets: Record<string, Asset>,
  options: { model: string; language: string },
  onProgress: (message: string, progress: number) => void,
): Promise<{ words: Word[]; wordLevel: boolean }> {
  onProgress('Ses hazırlanıyor', -1);
  const mix = await mixTimelineAudio(clips, assets, 16000, 1);
  const audio = await toMono(mix, 16000);
  if (!audio.some((v) => Math.abs(v) > 0.001)) throw new Error('Zaman çizelgesinde ses bulunamadı');

  return new Promise((resolve, reject) => {
    const w = getWorker();
    w.onmessage = ({ data }: MessageEvent<WhisperMessage>) => {
      if (data.type === 'progress') onProgress(data.message, data.progress);
      else if (data.type === 'error') reject(new Error(data.message));
      else resolve({ words: data.words, wordLevel: data.wordLevel });
    };
    const request: WhisperRequest = {
      audio,
      model: options.model,
      language: options.language === 'auto' ? null : options.language,
    };
    w.postMessage(request, [audio.buffer]);
  });
}

export function toSrt(groups: { start: number; duration: number; text: string }[]) {
  const stamp = (t: number) => {
    const ms = Math.round(t * 1000);
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  };
  return groups.map((g, i) => `${i + 1}\n${stamp(g.start)} --> ${stamp(g.start + g.duration)}\n${g.text}\n`).join('\n');
}
