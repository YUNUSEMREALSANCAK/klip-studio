import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeInOut, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SORU, useSceneTime} from '../timeline';
import {Magnifier} from './icons';
import {SECTORS} from './Sektor';

/* 40–44,3 sn · "Ben yazılım dışında hangi sektörde, hangi problemi herkesten daha iyi anlayabilirim?"
   Büyüteç sektörleri tek tek tarar, "herkesten daha iyi"de birinde durur. */

const Y = 820;
const xs = [190, 380, 570, 760];
const PICK = 3;

export const Soru: React.FC = () => {
  const t = useSceneTime('soru');
  const scan = prog(t, SORU.hangi, SORU.herkesten - SORU.hangi);
  const pos = easeInOut(Math.min(1, scan)) * PICK;
  const i0 = Math.floor(pos);
  const mx = xs[i0] + (xs[Math.min(PICK, i0 + 1)] - xs[i0]) * (pos - i0);
  const lens = pop(t, SORU.hangi - 0.2, 0.4);
  const found = pop(t, SORU.herkesten, 0.45);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.ink} dot={B.paper} opacity={0.08} />
      <Stage>
        {SECTORS.map((s, i) => {
          const q = pop(t, SORU.ben + 0.25 + i * 0.1, 0.4);
          const hit = i === PICK ? found : 0;
          return (
            <g key={s.label} transform={`translate(${xs[i]} ${Y}) scale(${q * (1 + hit * 0.18)})`}>
              <circle r={78} fill={hit > 0 ? B.lemon : B.paper} stroke={B.paper} strokeWidth={hit > 0 ? 8 : 0} opacity={hit > 0 || i === PICK ? 1 : 0.85} />
              <s.Icon s={0.8} />
            </g>
          );
        })}
        <Magnifier x={mx + 10} y={Y - 10} s={lens * (1.25 + found * 0.1)} />
        <Sparkle x={xs[PICK] + 110} y={Y - 110} r={26} color={B.lemon} spin={t * 60} scale={found} />
        <Sparkle x={xs[PICK] - 120} y={Y + 120} r={18} color={B.mint} spin={-t * 60} scale={pop(t, SORU.herkesten + 0.2)} />
      </Stage>
    </AbsoluteFill>
  );
};
