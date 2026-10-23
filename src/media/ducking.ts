import type { Asset, Clip } from '../core/types';
import { mixTimelineAudio } from './audio';

// Müzik kısma (ducking): konuşma olan anlarda "duck" işaretli kliplerin sesi düşürülür.

export const DUCK_RATE = 20; // zarf örnek/sn
const DUCK_LEVEL = 0.25;
const THRESHOLD = 0.02; // konuşma sayılan RMS
const ATTACK = 0.15; // sn
const RELEASE = 0.5;

// Duck işaretli olmayan seslerden konuşma zarfını çıkarır: 1 = tam ses, DUCK_LEVEL = kısık.
export async function computeDuckEnvelope(clips: Clip[], assets: Record<string, Asset>): Promise<Float32Array> {
  const voices = clips.filter((c) => !(c.type === 'media' && c.duck));
  const mix = await mixTimelineAudio(voices, assets, 8000, 1);
  const data = mix.getChannelData(0);
  const block = 8000 / DUCK_RATE;
  const envelope = new Float32Array(Math.ceil(data.length / block));
  let level = 1;
  for (let i = 0; i < envelope.length; i++) {
    let sum = 0;
    for (let j = i * block; j < Math.min((i + 1) * block, data.length); j++) sum += data[j] * data[j];
    const target = Math.sqrt(sum / block) > THRESHOLD ? DUCK_LEVEL : 1;
    const speed = 1 / ((target < level ? ATTACK : RELEASE) * DUCK_RATE);
    level += Math.sign(target - level) * Math.min(Math.abs(target - level), speed);
    envelope[i] = level;
  }
  return envelope;
}

export const envelopeAt = (envelope: Float32Array | null, t: number) =>
  envelope ? (envelope[Math.floor(t * DUCK_RATE)] ?? 1) : 1;

// Önizleme için önbellekli zarf: girdi değişince arka planda yeniden hesaplanır.
let cache: { key: string; envelope: Float32Array | null } = { key: '', envelope: null };

export function previewDuckEnvelope(clips: Clip[], assets: Record<string, Asset>): Float32Array | null {
  if (!clips.some((c) => c.type === 'media' && c.duck)) return null;
  const key = JSON.stringify(
    clips.filter((c) => c.type === 'media' && !c.duck).map((c) => c.type === 'media' && [c.assetId, c.start, c.in, c.duration, c.speed, c.volume, c.muted]),
  );
  if (cache.key !== key) {
    cache = { key, envelope: null };
    void computeDuckEnvelope(clips, assets).then((envelope) => {
      if (cache.key === key) cache.envelope = envelope;
    });
  }
  return cache.envelope;
}
