import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {B, easeInOut, easeOut, prog} from './brand';
import {ARMS, Fiti, mixArm, type Arm, type ArmPose, type Face} from './Fiti';
import {Stage} from './ui';

/* Fiti video boyunca tek karakter: bölümler arasında zıplayarak yer değiştirir,
   seslendirmeyle ağzını oynatır, göz kırpar, pozlar arasında yumuşak geçer.
   Her reel yalnızca konum (spots) ve poz (poses) listesini verir. */

/** Ayak noktası (x, y) ve ölçek. Her kayıtta zıplayarak yeni yerine geçer. */
export type Spot = {t: number; x: number; y: number; s: number};
export type PoseKey = {t: number; l: ArmPose; r: ArmPose; face: Face; tilt?: number};

const HOP = 0.6;
const BLEND = 0.22;

const lastBefore = <T extends {t: number}>(list: T[], t: number) => {
  let i = 0;
  while (i + 1 < list.length && list[i + 1].t <= t) i++;
  return i;
};

const armFor = (pose: ArmPose, t: number): Arm => {
  if (pose !== 'wave') return ARMS[pose];
  const w = Math.sin(t * Math.PI * 2 * 1.6);
  const [e, h] = ARMS.wave;
  return [e, [h[0] + w * 8, h[1] - Math.abs(w) * 3]];
};

type FitiTrackProps = {
  spots: Spot[];
  poses: PoseKey[];
  /** Kare başına ses yüksekliği (0-9), 30 fps */
  mouth: string;
  /** Bu saniyeden sonra gizlenir (kapanışta kendi Fiti'si var) */
  hideAfter: number;
};

export const FitiTrack: React.FC<FitiTrackProps> = ({spots, poses, mouth, hideAfter}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t > hideAfter) return null;

  // Konum: bölüm başında zıplama yayı
  const si = lastBefore(spots, t);
  const to = spots[si];
  const from = spots[Math.max(0, si - 1)];
  const hop = si === 0 ? 1 : easeInOut(prog(t, to.t, HOP));
  const x = from.x + (to.x - from.x) * hop;
  const s = from.s + (to.s - from.s) * hop;
  let y = from.y + (to.y - from.y) * hop - Math.sin(Math.PI * hop) * (si === 0 ? 0 : 170);
  // Giriş: alttan zıplar
  const enter = prog(t, 0.1, 0.45);
  y += (1 - easeOut(enter)) * 900 - Math.sin(Math.PI * enter) * 140;
  const landAt = si === 0 ? 0.55 : to.t + HOP;
  const land = prog(t, landAt, 0.24);
  const squash = 1 - Math.sin(Math.PI * land) * 0.09 + (hop > 0 && hop < 1 ? 0.04 : 0);

  // Poz: önceki ile şimdiki arasında yumuşak geçiş
  const pi = lastBefore(poses, t);
  const cur = poses[pi];
  const prev = poses[Math.max(0, pi - 1)];
  const k = easeInOut(prog(t, cur.t, BLEND));
  const armL = mixArm(armFor(prev.l, t), armFor(cur.l, t), k);
  const armR = mixArm(armFor(prev.r, t), armFor(cur.r, t), k);
  const tilt = (prev.tilt ?? 0) + ((cur.tilt ?? 0) - (prev.tilt ?? 0)) * k;
  const face = k > 0.5 ? cur.face : prev.face;

  const amp = Number(mouth[frame] ?? '0') / 9;
  const talk = amp > 0.12 ? Math.min(1, amp * 1.15) : 0;
  const blink = frame % 96 > 92 || (frame + 40) % 223 > 219;
  const bob = Math.sin(t * Math.PI * 2 * 0.9) * 2.2;

  return (
    <Stage>
      <ellipse cx={x} cy={to.y + 2} rx={52 * s * (1 - Math.sin(Math.PI * hop) * 0.3)} ry={4.5 * s} fill={B.ink} opacity={0.13} />
      <g transform={`translate(${x - 120 * s} ${y - 322 * s}) scale(${s})`}>
        <Fiti
          armL={armL}
          armR={armR}
          face={face}
          tilt={tilt}
          talk={talk}
          blink={blink}
          bob={bob}
          squash={squash}
          pointL={cur.l.startsWith('point')}
          pointR={cur.r.startsWith('point')}
        />
      </g>
    </Stage>
  );
};
