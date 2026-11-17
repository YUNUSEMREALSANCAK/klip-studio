import {CatmullRomCurve3, Vector3} from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export type V3 = [number, number, number];

/** Sahnenin içinde, seslendirmeyle aynı (global) saniyeyi verir; start = sahnenin global başlangıcı */
export const useGlobalTime = (start: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return start + frame / fps;
};

/** Tekrarlanabilir rastgele sayı üreteci (her render'da aynı sahne) */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** t, [a, b] aralığında 0→1 ilerleme */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x: number) => x * x * x;
export const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const lerp3 = (a: V3, b: V3, x: number): V3 => [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x)];
/** İki zaman arasında yanıp sönmeyen "açık" penceresi: a'da yükselir, b'de söner */
export const pulse = (t: number, a: number, b: number, fade = 0.25) => clamp01((t - a) / fade) * clamp01((b - t) / fade);

/** Fiber ile aynı eğri: bir nesneyi kablo boyunca taşımak için */
export const makeCurve = (points: V3[]) => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal');
export const along = (curve: CatmullRomCurve3, s: number): V3 => {
  const v = curve.getPointAt(clamp01(s));
  return [v.x, v.y, v.z];
};
