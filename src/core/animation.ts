import type { Keyframe, KeyframeProp, MediaClip, Transform } from './types';

const FRAME = 1 / 60; // aynı ana düşen anahtar kare toleransı

export function baseValue(clip: MediaClip, prop: KeyframeProp): number {
  if (prop === 'opacity') return clip.opacity;
  if (prop === 'volume') return clip.volume;
  return clip.transform[prop];
}

const keysFor = (clip: MediaClip, prop: KeyframeProp) =>
  clip.keyframes.filter((k) => k.prop === prop).sort((a, b) => a.time - b.time);

const smooth = (x: number) => x * x * (3 - 2 * x);

// t: zaman çizelgesi saniyesi. Anahtar kare yoksa temel değer döner.
export function valueAt(clip: MediaClip, prop: KeyframeProp, t: number): number {
  const keys = keysFor(clip, prop);
  if (!keys.length) return baseValue(clip, prop);
  const local = t - clip.start;
  if (local <= keys[0].time) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (local <= b.time) return a.value + (b.value - a.value) * smooth((local - a.time) / (b.time - a.time));
  }
  return keys[keys.length - 1].value;
}

export interface AnimatedState {
  transform: Transform;
  opacity: number;
  volume: number;
}

export function animatedState(clip: MediaClip, t: number): AnimatedState {
  if (!clip.keyframes.length) return { transform: clip.transform, opacity: clip.opacity, volume: clip.volume };
  return {
    transform: {
      x: valueAt(clip, 'x', t),
      y: valueAt(clip, 'y', t),
      scale: valueAt(clip, 'scale', t),
      rotation: valueAt(clip, 'rotation', t),
    },
    opacity: valueAt(clip, 'opacity', t),
    volume: valueAt(clip, 'volume', t),
  };
}

export const hasKeyframes = (clip: MediaClip, prop: KeyframeProp) => clip.keyframes.some((k) => k.prop === prop);

export const keyframeAt = (clip: MediaClip, prop: KeyframeProp, t: number): Keyframe | undefined =>
  clip.keyframes.find((k) => k.prop === prop && Math.abs(k.time - (t - clip.start)) < FRAME);

function withBase(clip: MediaClip, prop: KeyframeProp, value: number): Partial<MediaClip> {
  if (prop === 'opacity') return { opacity: value };
  if (prop === 'volume') return { volume: value };
  return { transform: { ...clip.transform, [prop]: value } };
}

// Bir özelliği değiştirir: o özellikte anahtar kare varsa t anındaki kareyi günceller/ekler, yoksa temel değeri.
export function setValue(clip: MediaClip, prop: KeyframeProp, value: number, t: number): Partial<MediaClip> {
  if (!hasKeyframes(clip, prop)) return withBase(clip, prop, value);
  const time = t - clip.start;
  const others = clip.keyframes.filter((k) => !(k.prop === prop && Math.abs(k.time - time) < FRAME));
  return { keyframes: [...others, { prop, time, value }] };
}

// t anında anahtar kare varsa siler, yoksa o anki değerle ekler.
export function toggleKeyframe(clip: MediaClip, prop: KeyframeProp, t: number): Partial<MediaClip> {
  const existing = keyframeAt(clip, prop, t);
  if (existing) return { keyframes: clip.keyframes.filter((k) => k !== existing) };
  const time = Math.min(Math.max(t - clip.start, 0), clip.duration);
  return { keyframes: [...clip.keyframes, { prop, time, value: valueAt(clip, prop, t) }] };
}

// Giriş/çıkış fade çarpanı (0..1).
export function fadeGain(clip: MediaClip, t: number): number {
  const local = t - clip.start;
  let gain = 1;
  if (clip.fadeIn > 0) gain = Math.min(gain, local / clip.fadeIn);
  if (clip.fadeOut > 0) gain = Math.min(gain, (clip.duration - local) / clip.fadeOut);
  return Math.max(0, Math.min(1, gain));
}
