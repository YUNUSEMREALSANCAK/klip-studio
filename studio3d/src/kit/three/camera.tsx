import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect} from 'react';
import type {PerspectiveCamera} from 'three';
import {easeIn, easeInOut, easeOut, type V3} from './util';

/** Kamera anahtar karesi. t: global saniye, p: konum, l: bakılan nokta. */
export type CamKey = {t: number; p: V3; l: V3; fov?: number; roll?: number; ease?: 'linear' | 'in' | 'out' | 'inOut'};

const EASE = {linear: (x: number) => x, in: easeIn, out: easeOut, inOut: easeInOut};

/**
 * Monoton kübik Hermite: anahtarlar arasında akıcı, ama hedefi asla aşmayan yol.
 * (Catmull-Rom uzak bir sonraki anahtar yüzünden kadrajı kaydırıyordu.)
 */
const slope = (keys: CamKey[], get: (k: CamKey) => number, i: number) => (get(keys[i + 1]) - get(keys[i])) / (keys[i + 1].t - keys[i].t);

const tangent = (keys: CamKey[], get: (k: CamKey) => number, i: number) => {
  const n = keys.length;
  if (i === 0) return slope(keys, get, 0);
  if (i === n - 1) return slope(keys, get, n - 2);
  const s0 = slope(keys, get, i - 1);
  const s1 = slope(keys, get, i);
  if (s0 * s1 <= 0) return 0;
  const m = (s0 + s1) / 2;
  const lim = 3 * Math.min(Math.abs(s0), Math.abs(s1));
  return Math.sign(m) * Math.min(Math.abs(m), lim);
};

const hermite = (keys: CamKey[], get: (k: CamKey) => number, i: number, u: number) => {
  const dt = keys[i + 1].t - keys[i].t;
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * get(keys[i]) +
    (u3 - 2 * u2 + u) * dt * tangent(keys, get, i) +
    (-2 * u3 + 3 * u2) * get(keys[i + 1]) +
    (u3 - u2) * dt * tangent(keys, get, i + 1)
  );
};

const hermiteV = (keys: CamKey[], pick: 'p' | 'l', i: number, u: number): V3 => [
  hermite(keys, (k) => k[pick][0], i, u),
  hermite(keys, (k) => k[pick][1], i, u),
  hermite(keys, (k) => k[pick][2], i, u),
];

export const sampleCam = (keys: CamKey[], t: number) => {
  if (t <= keys[0].t) return {p: keys[0].p, l: keys[0].l, fov: keys[0].fov ?? 38, roll: keys[0].roll ?? 0};
  const last = keys[keys.length - 1];
  if (t >= last.t) return {p: last.p, l: last.l, fov: last.fov ?? 38, roll: last.roll ?? 0};
  let i = 0;
  while (t > keys[i + 1].t) i++;
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const u = EASE[k2.ease ?? 'linear']((t - k1.t) / (k2.t - k1.t));
  const f1 = k1.fov ?? 38;
  const f2 = k2.fov ?? 38;
  return {
    p: hermiteV(keys, 'p', i, u),
    l: hermiteV(keys, 'l', i, u),
    fov: f1 + (f2 - f1) * easeInOut(u),
    roll: (k1.roll ?? 0) + ((k2.roll ?? 0) - (k1.roll ?? 0)) * u,
  };
};

/** Kameranın o andaki son hali (salınım dahil). Etiket katmanı da aynı hesabı kullanır. */
export const cameraPose = (keys: CamKey[], t: number, sway = 1) => {
  const {p, l, fov, roll} = sampleCam(keys, t);
  const sx = Math.sin(t * 0.83) * 0.04 * sway + Math.sin(t * 2.1) * 0.012 * sway;
  const sy = Math.sin(t * 0.61 + 1.3) * 0.035 * sway;
  return {
    position: [p[0] + sx, p[1] + sy, p[2]] as V3,
    look: [l[0] + sx * 0.5, l[1] + sy * 0.5, l[2]] as V3,
    up: [Math.sin(roll), Math.cos(roll), 0] as V3,
    fov,
  };
};

/** Kamerayı her karede anahtarlara göre yerleştirir. Hafif el kamerası salınımı FPV hissi verir. */
export const CameraRig: React.FC<{keys: CamKey[]; t: number; sway?: number}> = ({keys, t, sway = 1}) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const pose = cameraPose(keys, t, sway);

  useLayoutEffect(() => {
    camera.position.set(...pose.position);
    camera.up.set(...pose.up);
    camera.lookAt(...pose.look);
    camera.fov = pose.fov;
    camera.near = 0.05;
    camera.far = 4000;
    camera.updateProjectionMatrix();
  });
  return null;
};
