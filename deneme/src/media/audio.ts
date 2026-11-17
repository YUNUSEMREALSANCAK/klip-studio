import { ALL_FORMATS, AudioBufferSink, BlobSource, Input } from 'mediabunny';
import { clipEnd, projectDuration } from '../core/timeline';
import { fadeGain, valueAt } from '../core/animation';
import { sourceOffset } from '../core/speed';
import type { Asset, Clip, MediaClip } from '../core/types';
import { timeStretch } from './timeStretch';

const decoded = new Map<string, Promise<AudioBuffer>>();

// Decodes an asset's audio once and caches it.
export function decodeAssetAudio(asset: Asset): Promise<AudioBuffer> {
  if (!decoded.has(asset.id)) decoded.set(asset.id, decode(asset));
  return decoded.get(asset.id)!;
}

async function decode(asset: Asset): Promise<AudioBuffer> {
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await asset.file.arrayBuffer());
  } catch {
    return decodeWithMediabunny(asset);
  } finally {
    void context.close();
  }
}

// Fallback for containers decodeAudioData can't open.
async function decodeWithMediabunny(asset: Asset): Promise<AudioBuffer> {
  const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new Error('This file has no audio');
  const parts: AudioBuffer[] = [];
  for await (const { buffer } of new AudioBufferSink(track).buffers()) parts.push(buffer);
  const first = parts[0];
  const length = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new AudioBuffer({ length, sampleRate: first.sampleRate, numberOfChannels: first.numberOfChannels });
  let offset = 0;
  for (const part of parts) {
    for (let ch = 0; ch < out.numberOfChannels; ch++) {
      out.copyToChannel(part.getChannelData(Math.min(ch, part.numberOfChannels - 1)), ch, offset);
    }
    offset += part.length;
  }
  return out;
}

const audible = (clip: Clip, assets: Record<string, Asset>): clip is MediaClip =>
  clip.type === 'media' && !clip.muted && clip.volume > 0 && !!assets[clip.assetId]?.hasAudio;

const GAIN_RATE = 50; // volume envelope samples/s

// Cuts [from, from + length) from the source (padding with silence if needed).
function slice(buffer: AudioBuffer, from: number, length: number): AudioBuffer {
  const start = Math.max(0, Math.floor(from * buffer.sampleRate));
  const frames = Math.max(1, Math.floor(length * buffer.sampleRate));
  const out = new AudioBuffer({ length: frames, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(start, start + frames), ch);
  }
  return out;
}

const CURVE_CHUNK = 0.25; // s; the curve is split into constant-speed pieces of this length

// Renders a speed-curved clip's audio in short pieces, stretching each at its own average speed.
function stretchCurve(decoded: AudioBuffer, clip: MediaClip, skip: number, length: number): AudioBuffer {
  const parts: AudioBuffer[] = [];
  for (let local = skip; local < skip + length - 1e-6; local += CURVE_CHUNK) {
    const end = Math.min(local + CURVE_CHUNK, skip + length);
    const from = clip.in + sourceOffset(clip, local);
    const span = sourceOffset(clip, end) - sourceOffset(clip, local);
    parts.push(timeStretch(slice(decoded, from, span), span / (end - local)));
  }
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new AudioBuffer({ length: Math.max(1, total), sampleRate: decoded.sampleRate, numberOfChannels: decoded.numberOfChannels });
  let offset = 0;
  for (const part of parts) {
    for (let ch = 0; ch < out.numberOfChannels; ch++) out.copyToChannel(part.getChannelData(ch), ch, offset);
    offset += part.length;
  }
  return out;
}

// Mixes all timeline audio into a single AudioBuffer.
// Applies speed (pitch preserved), volume keyframes, fades and ducking.
export async function mixTimelineAudio(
  clips: Clip[],
  assets: Record<string, Asset>,
  sampleRate: number,
  channels: number,
  range: [number, number] = [0, projectDuration(clips)],
): Promise<AudioBuffer> {
  const [from, to] = range;
  const length = Math.max(1, Math.ceil((to - from) * sampleRate));
  const context = new OfflineAudioContext({ numberOfChannels: channels, length, sampleRate });
  const needsDuck = clips.some((c) => c.type === 'media' && c.duck && audible(c, assets));
  const { computeDuckEnvelope, envelopeAt } = await import('./ducking');
  const envelope = needsDuck ? await computeDuckEnvelope(clips, assets) : null;

  for (const clip of clips) {
    if (!audible(clip, assets) || clipEnd(clip) <= from || clip.start >= to) continue;
    const decoded = await decodeAssetAudio(assets[clip.assetId]);
    const skip = Math.max(0, from - clip.start);
    const playLength = Math.min(clip.duration - skip, to - Math.max(clip.start, from));
    const segment = clip.speedCurve
      ? stretchCurve(decoded, clip, skip, playLength)
      : timeStretch(slice(decoded, clip.in + skip * clip.speed, playLength * clip.speed), clip.speed);
    const source = context.createBufferSource();
    source.buffer = segment;

    // Volume envelope: base/keyframe × fade × ducking
    const gain = context.createGain();
    const steps = Math.max(2, Math.ceil(playLength * GAIN_RATE));
    const curve = Float32Array.from({ length: steps }, (_, i) => {
      const t = clip.start + skip + (i / (steps - 1)) * playLength;
      return valueAt(clip, 'volume', t) * fadeGain(clip, t) * (clip.duck ? envelopeAt(envelope, t) : 1);
    });
    const when = Math.max(0, clip.start - from);
    gain.gain.setValueCurveAtTime(curve, when, playLength);
    source.connect(gain).connect(context.destination);
    source.start(when);
  }
  return context.startRendering();
}

// Downmixes an AudioBuffer to mono at the requested sample rate.
export async function toMono(buffer: AudioBuffer, sampleRate: number): Promise<Float32Array> {
  const length = Math.ceil(buffer.duration * sampleRate);
  const context = new OfflineAudioContext({ numberOfChannels: 1, length, sampleRate });
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  return rendered.getChannelData(0);
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
