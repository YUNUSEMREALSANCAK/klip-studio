import type { MediaClip, SpeedCurve } from './types';

// Hız eğrisi hesapları. Eğri parçalı doğrusaldır; kaynak zamanı hızın integralidir.

export const SPEED_CURVES: SpeedCurve[] = [
  { name: 'Montaj', points: [{ u: 0, speed: 2.5 }, { u: 0.35, speed: 2.5 }, { u: 0.45, speed: 0.6 }, { u: 0.6, speed: 0.6 }, { u: 0.7, speed: 2.5 }, { u: 1, speed: 2.5 }] },
  { name: 'Kahraman anı', points: [{ u: 0, speed: 1.5 }, { u: 0.35, speed: 1.5 }, { u: 0.45, speed: 0.3 }, { u: 0.6, speed: 0.3 }, { u: 0.7, speed: 1.5 }, { u: 1, speed: 1.5 }] },
  { name: 'Mermi zamanı', points: [{ u: 0, speed: 3 }, { u: 0.3, speed: 3 }, { u: 0.4, speed: 0.25 }, { u: 0.6, speed: 0.25 }, { u: 0.7, speed: 3 }, { u: 1, speed: 3 }] },
  { name: 'Yavaş gir', points: [{ u: 0, speed: 0.4 }, { u: 1, speed: 2 }] },
  { name: 'Yavaş çık', points: [{ u: 0, speed: 2 }, { u: 1, speed: 0.4 }] },
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

// ∫₀ᵘ hız(v) dv — parçalı doğrusal eğri altında kalan alan (yamuk kuralı, kesin).
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

// Klibin başından local saniye sonra kaynakta kaç saniye ilerlendiği.
export function sourceOffset(clip: MediaClip, local: number): number {
  if (!clip.speedCurve) return local * clip.speed;
  return clip.duration * curveArea(clip.speedCurve, local / clip.duration);
}

// Klibin o andaki oynatma hızı (önizlemede playbackRate).
export function speedAt(clip: MediaClip, local: number): number {
  return clip.speedCurve ? curveSpeedAt(clip.speedCurve, local / clip.duration) : clip.speed;
}
