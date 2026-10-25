import type { ClipMotion, Easing, Keyframe, KeyframeProp, MediaClip, MotionType, Transform } from './types';

const FRAME = 1 / 60; // tolerance for keyframes at the same moment

export function baseValue(clip: MediaClip, prop: KeyframeProp): number {
  if (prop === 'opacity') return clip.opacity;
  if (prop === 'volume') return clip.volume;
  return clip.transform[prop];
}

const keysFor = (clip: MediaClip, prop: KeyframeProp) => clip.keyframes.filter((k) => k.prop === prop).sort((a, b) => a.time - b.time);

const smooth = (x: number) => x * x * (3 - 2 * x);

// t: timeline seconds. Returns the base value when there are no keyframes.
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

// Sets a property: if it has keyframes, updates/adds the keyframe at t; otherwise the base value.
export function setValue(clip: MediaClip, prop: KeyframeProp, value: number, t: number): Partial<MediaClip> {
  if (!hasKeyframes(clip, prop)) return withBase(clip, prop, value);
  const time = t - clip.start;
  const others = clip.keyframes.filter((k) => !(k.prop === prop && Math.abs(k.time - time) < FRAME));
  return { keyframes: [...others, { prop, time, value }] };
}

// Removes the keyframe at t if there is one, otherwise adds one with the current value.
export function toggleKeyframe(clip: MediaClip, prop: KeyframeProp, t: number): Partial<MediaClip> {
  const existing = keyframeAt(clip, prop, t);
  if (existing) return { keyframes: clip.keyframes.filter((k) => k !== existing) };
  const time = Math.min(Math.max(t - clip.start, 0), clip.duration);
  return { keyframes: [...clip.keyframes, { prop, time, value: valueAt(clip, prop, t) }] };
}

// Fade-in/out multiplier (0..1).
export function fadeGain(clip: MediaClip, t: number): number {
  const local = t - clip.start;
  let gain = 1;
  if (clip.fadeIn > 0) gain = Math.min(gain, local / clip.fadeIn);
  if (clip.fadeOut > 0) gain = Math.min(gain, (clip.duration - local) / clip.fadeOut);
  return Math.max(0, Math.min(1, gain));
}

export const EASINGS: Record<Easing, (p: number) => number> = {
  linear: (p) => p,
  easeIn: (p) => p * p * p,
  easeOut: (p) => 1 - (1 - p) ** 3,
  easeInOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
};

// Moves a state away from rest by `away` (0 = at rest, 1 = fully out). Slides continue in their direction,
// so a "slide left" clip enters from the right and leaves to the left.
function applyMotion(state: AnimatedState, type: MotionType, away: number, entering: boolean): AnimatedState {
  const { transform } = state;
  const sign = entering ? 1 : -1;
  const slide = { slideleft: [1, 0], slideright: [-1, 0], slideup: [0, 1], slidedown: [0, -1] } as Record<string, [number, number]>;
  if (slide[type]) {
    const [dx, dy] = slide[type];
    return { ...state, transform: { ...transform, x: transform.x + dx * away * sign, y: transform.y + dy * away * sign } };
  }
  const opacity = state.opacity * (1 - away);
  if (type === 'zoom') return { ...state, opacity, transform: { ...transform, scale: transform.scale * (1 - 0.4 * away) } };
  if (type === 'spin') {
    return { ...state, opacity, transform: { ...transform, scale: transform.scale * (1 - 0.6 * away), rotation: transform.rotation - 180 * away * sign } };
  }
  return { ...state, opacity };
}

const motionAway = (motion: ClipMotion | undefined, remaining: number) =>
  motion && motion.duration > 0 && remaining < motion.duration ? 1 - EASINGS.easeOut(Math.max(remaining, 0) / motion.duration) : 0;

// A visual clip's in and out animations on top of its keyframed state.
export function withMotion(clip: MediaClip, state: AnimatedState, t: number): AnimatedState {
  const local = t - clip.start;
  const awayIn = motionAway(clip.animIn, local);
  const awayOut = motionAway(clip.animOut, clip.duration - local);
  let next = state;
  if (awayIn > 0) next = applyMotion(next, clip.animIn!.type, awayIn, true);
  if (awayOut > 0) next = applyMotion(next, clip.animOut!.type, awayOut, false);
  return next;
}
