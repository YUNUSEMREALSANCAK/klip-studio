import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeInOut, pop, prog} from '../../../kit2d/brand';
import {Cursor} from '../../../kit2d/shapes';
import {DotGrid, Stage} from '../../../kit2d/ui';
import {ANKET, SCENES, useSceneTime} from '../timeline';
import {Bulb, CodeIcon, Label} from './icons';

/* 49,5–53,5 sn · "Sizce yazılımcılığın geleceği kod yazmak mı, problem çözmek mi? Yorumlara yaz!"
   Anket kartı: imleç iki seçenek arasında kararsız gezer (seçim yapılmaz), yorum balonu. */

const OPTS = [
  {y: 610, label: 'Kod yazmak', at: ANKET.kodYazmak, icon: <CodeIcon s={0.6} />, dot: B.mint},
  {y: 770, label: 'Problem çözmek', at: ANKET.problem, icon: <Bulb s={0.55} />, dot: B.lemon},
];

export const Anket: React.FC = () => {
  const t = useSceneTime('anket');
  const card = pop(t, SCENES.anket[0] + 0.15, 0.5);
  // İmleç: 1. seçenek → 2. seçenek → ikisi arasında gidip gelir
  const toSecond = easeInOut(prog(t, ANKET.problem - 0.1, 0.35));
  const dither = t > ANKET.mi ? Math.sin((t - ANKET.mi) * 5) * 0.5 + 0.5 : 1;
  const cy = OPTS[0].y + (OPTS[1].y - OPTS[0].y) * toSecond * dither;
  const hover = (i: number) => (i === 0 ? 1 - toSecond * dither : toSecond * dither) * (t > ANKET.kodYazmak ? 1 : 0);
  const bubble = pop(t, ANKET.yorumlara, 0.4);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <g transform={`translate(540 690) scale(${card}) translate(-540 -690)`}>
          <rect x={88} y={530} width={920} height={340} rx={36} fill={B.ink} />
          <rect x={80} y={520} width={920} height={340} rx={36} fill={B.white} stroke={B.ink} strokeWidth={6} />
          {OPTS.map((o, i) => {
            const q = pop(t, o.at - 0.15, 0.4);
            const h = hover(i);
            return (
              <g key={o.label} transform={`translate(0 ${(1 - q) * 30})`} opacity={Math.min(1, q * 1.5)}>
                <rect x={120} y={o.y - 60} width={840} height={120} rx={60} fill={h > 0.5 ? o.dot : B.paper} stroke={B.ink} strokeWidth={6} />
                <g transform={`translate(196 ${o.y})`}>
                  <circle r={44} fill={B.white} stroke={B.ink} strokeWidth={5} />
                  {o.icon}
                </g>
                <Label x={270} y={o.y + 16} size={48} anchor="start">
                  {o.label}
                </Label>
                <Label x={900} y={o.y + 18} size={56} anchor="middle" color={B.ink3}>
                  ?
                </Label>
              </g>
            );
          })}
        </g>
        {t > ANKET.kodYazmak - 0.2 ? <Cursor x={760} y={cy + 4} s={1.6} /> : null}
        <g transform={`translate(840 1170) scale(${bubble})`}>
          <path d="M-90 -64 H90 Q118 -64 118 -36 V30 Q118 58 90 58 H-20 L-58 92 L-50 58 H-90 Q-118 58 -118 30 V-36 Q-118 -64 -90 -64 Z" fill={B.white} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
          {[0, 1, 2].map((d) => (
            <circle key={d} cx={-40 + d * 40} cy={-4 - Math.max(0, Math.sin(t * 9 - d)) * 10} r={12} fill={B.orange} />
          ))}
        </g>
      </Stage>
    </AbsoluteFill>
  );
};
