import type { MediaClip, SpeedCurve } from './types';

// Speed curve math. The curve is piecewise linear; source time is the integral of speed.

export const SPEED_CURVES: SpeedCurve[] = [
  {
    name: 'Montage',
    points: [
      { u: 0, speed: 2.5 },
      { u: 0.35, speed: 2.5 },
      { u: 0.45, speed: 0.6 },
      { u: 0.6, speed: 0.6 },
      { u: 0.7, speed: 2.5 },
      { u: 1, speed: 2.5 },
    ],
  },
  {
    name: 'Hero moment',
    points: [
      { u: 0, speed: 1.5 },
      { u: 0.35, speed: 1.5 },
      { u: 0.45, speed: 0.3 },
      { u: 0.6, speed: 0.3 },
      { u: 0.7, speed: 1.5 },
      { u: 1, speed: 1.5 },
    ],
  },
  {
    name: 'Bullet time',
    points: [
      { u: 0, speed: 3 },
      { u: 0.3, speed: 3 },
      { u: 0.4, speed: 0.25 },
      { u: 0.6, speed: 0.25 },
      { u: 0.7, speed: 3 },
      { u: 1, speed: 3 },
    ],
  },
  {
    name: 'Ease in',
    points: [
      { u: 0, speed: 0.4 },
      { u: 1, speed: 2 },
    ],
  },
  {
    name: 'Ease out',
    points: [
      { u: 0, speed: 2 },
      { u: 1, speed: 0.4 },
    ],
  },
];

const clamp01 = (u: number) => Math.min(Math.max(u, 0), 1);

export function curveSpeedAt(curve: SpeedCurve, u: number): number {
  const { points } = curve;
  const x = clamp01(u);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b.u) return a.speed + (b.speed - a.speed) * ((x - a.u) / (b.u - a.u || 1));
  }
  return points[points.length - 1].speed;
}

// ∫₀ᵘ speed(v) dv — area under the piecewise-linear curve (trapezoid rule, exact).
export function curveArea(curve: SpeedCurve, u: number): number {
  const { points } = curve;
  const x = clamp01(u);
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= a.u) break;
    const end = Math.min(x, b.u);
    area += ((a.speed + curveSpeedAt(curve, end)) / 2) * (end - a.u);
  }
  return area;
}

export const averageSpeed = (curve: SpeedCurve) => curveArea(curve, 1);

// Source seconds advanced `local` seconds after the clip starts.
export function sourceOffset(clip: MediaClip, local: number): number {
  if (!clip.speedCurve) return local * clip.speed;
  return clip.duration * curveArea(clip.speedCurve, local / clip.duration);
}

// The clip's playback speed at that moment (playbackRate in the preview).
export function speedAt(clip: MediaClip, local: number): number {
  return clip.speedCurve ? curveSpeedAt(clip.speedCurve, local / clip.duration) : clip.speed;
}
