import { sourceSpan } from '../core/timeline';
import type { Asset, Clip, MediaClip, Word } from '../core/types';
import { decodeAssetAudio, encodeWav, mixTimelineAudio, toMono } from '../media/audio';

// RNNoise: the noise suppression network CapCut also ships (rnnoise_v2.0.model).
export async function denoiseClip(clip: MediaClip, asset: Asset, onProgress: (p: number) => void): Promise<Blob> {
  const RATE = 48000; // RNNoise expects 48 kHz
  const buffer = await decodeAssetAudio(asset);
  const full = await toMono(buffer, RATE);
  const samples = full.slice(Math.floor(clip.in * RATE), Math.floor((clip.in + sourceSpan(clip)) * RATE));

  // The 4.8 MB wasm is loaded only when this feature is used.
  const { Rnnoise } = await import('@shiguredo/rnnoise-wasm');
  const rnnoise = await Rnnoise.load();
  const state = rnnoise.createDenoiseState();
  const frame = new Float32Array(rnnoise.frameSize);
  const output = new Float32Array(samples.length);
  for (let offset = 0; offset < samples.length; offset += rnnoise.frameSize) {
    frame.fill(0);
    frame.set(samples.subarray(offset, offset + rnnoise.frameSize));
    for (let i = 0; i < frame.length; i++) frame[i] *= 32768; // 16-bit PCM scale
    state.processFrame(frame);
    const count = Math.min(rnnoise.frameSize, samples.length - offset);
    for (let i = 0; i < count; i++) output[offset + i] = frame[i] / 32768;
    if (offset % (RATE * 2) < rnnoise.frameSize) onProgress(offset / samples.length);
  }
  state.destroy();
  return encodeWav(output, RATE);
}

// Finds silent ranges by RMS energy. Returned ranges are in timeline seconds.
export async function detectSilences(
  clips: Clip[],
  assets: Record<string, Asset>,
  options: { thresholdDb: number; minDuration: number; padding: number },
): Promise<[number, number][]> {
  const RATE = 16000;
  const mix = await mixTimelineAudio(clips, assets, RATE, 1);
  const samples = mix.getChannelData(0);
  const window = Math.floor(RATE * 0.02);
  const threshold = 10 ** (options.thresholdDb / 20);
  const ranges: [number, number][] = [];
  let silentStart: number | null = null;

  for (let i = 0; i < samples.length; i += window) {
    let sum = 0;
    const end = Math.min(i + window, samples.length);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    const rms = Math.sqrt(sum / (end - i));
    const t = i / RATE;
    if (rms < threshold) silentStart ??= t;
    else if (silentStart !== null) {
      pushRange(ranges, silentStart, t, options);
      silentStart = null;
    }
  }
  if (silentStart !== null) pushRange(ranges, silentStart, samples.length / RATE, options);
  return ranges;
}

function pushRange(ranges: [number, number][], start: number, end: number, o: { minDuration: number; padding: number }) {
  if (end - start >= o.minDuration) ranges.push([start + o.padding, end - o.padding]);
}

export const FILLER_WORDS = ['ııı', 'ıı', 'ee', 'eee', 'hmm', 'şey', 'yani', 'um', 'uh', 'uhm', 'erm', 'hani'];

// Finds filler words (um, uh, eee, şey…) in the transcript.
export function fillerRanges(words: Word[], fillers: string[]): [number, number][] {
  const set = new Set(fillers.map((f) => f.toLocaleLowerCase('tr')));
  return words.filter((w) => set.has(w.text.toLocaleLowerCase('tr').replace(/[.,!?…]/g, ''))).map((w) => [w.start, w.end]);
}

// Simple beat detection: finds sudden jumps in the energy flux.
export async function detectBeats(clip: MediaClip, asset: Asset): Promise<number[]> {
  const RATE = 22050;
  const mono = await toMono(await decodeAssetAudio(asset), RATE);
  const hop = 512;
  const energies: number[] = [];
  const from = Math.floor(clip.in * RATE);
  const to = Math.min(mono.length, Math.floor((clip.in + sourceSpan(clip)) * RATE));
  for (let i = from; i < to; i += hop) {
    let sum = 0;
    for (let j = i; j < Math.min(i + hop, to); j++) sum += mono[j] * mono[j];
    energies.push(sum);
  }
  const flux = energies.map((e, i) => Math.max(0, e - (energies[i - 1] ?? e)));
  const beats: number[] = [];
  const span = 43; // ~1 s local window
  let last = -Infinity;
  for (let i = 0; i < flux.length; i++) {
    const local = flux.slice(Math.max(0, i - span), i + span);
    const mean = local.reduce((a, b) => a + b, 0) / local.length;
    const t = (i * hop) / RATE;
    const isPeak = flux[i] > mean * 1.8 && flux[i] >= (flux[i - 1] ?? 0) && flux[i] >= (flux[i + 1] ?? 0);
    if (isPeak && t - last > 0.25) {
      beats.push(clip.start + t / clip.speed);
      last = t;
    }
  }
  return beats;
}
