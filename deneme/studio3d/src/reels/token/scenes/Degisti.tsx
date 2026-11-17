import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {DEG, SCENES, useSceneTime} from '../timeline';

/* 4,6–11 sn · "Yapay zekâdan sonra kod yazma şeklimiz tamamen değişti.
   Ben en son ne zaman oturup sıfırdan bir for döngüsü yazdım, hatırlamıyorum bile." */

/** Editörde kendi kendine yazılan satırlar: [girinti, uzunluk, renk] */
const LINES: [number, number, string][] = [
  [0, 300, B.orange],
  [1, 520, B.ink3],
  [1, 410, B.mintDark],
  [2, 360, B.ink3],
  [2, 470, B.orange],
  [1, 280, B.mintDark],
  [0, 180, B.ink3],
];
const EDITOR = {x: 80, y: 560, w: 920, h: 440};
const LINE_AT = (i: number) => DEG.yapay + 0.2 + i * 0.24;

const Editor: React.FC<{t: number}> = ({t}) => {
  const fade = 1 - 0.45 * prog(t, DEG.ben, 0.4);
  const last = LINES.reduce((acc, _, i) => (t >= LINE_AT(i) ? i : acc), -1);
  return (
    <g transform={`translate(${EDITOR.x} ${EDITOR.y + (1 - pop(t, SCENES.degisti[0] + 0.05, 0.5)) * 80})`} opacity={fade}>
      <rect x={10} y={12} width={EDITOR.w} height={EDITOR.h} rx={30} fill={B.ink} />
      <rect width={EDITOR.w} height={EDITOR.h} rx={30} fill={B.white} stroke={B.ink} strokeWidth={6} />
      <path d={`M0 74 H${EDITOR.w}`} stroke={B.ink} strokeWidth={6} />
      {[B.orange, B.lemon, B.mint].map((c, i) => (
        <circle key={c} cx={44 + i * 38} cy={37} r={12} fill={c} stroke={B.ink} strokeWidth={4} />
      ))}
      <text x={180} y={47} fontFamily={mono} fontWeight={600} fontSize={24} fill={B.muted}>
        proje.ts
      </text>
      {LINES.map(([indent, len, color], i) => {
        const p = prog(t, LINE_AT(i), 0.22);
        if (p <= 0) return null;
        const y = 116 + i * 44;
        return (
          <g key={i}>
            <text x={36} y={y + 9} fontFamily={mono} fontSize={20} fill={B.muted}>
              {i + 1}
            </text>
            <rect x={84 + indent * 44} y={y - 9} width={len * p} height={18} rx={9} fill={color} opacity={0.85} />
          </g>
        );
      })}
      {last >= 0 && t < DEG.ben ? (
        <g transform={`translate(${84 + LINES[last][0] * 44 + LINES[last][1] * prog(t, LINE_AT(last), 0.22) + 26} ${116 + last * 44})`}>
          <Sparkle x={0} y={0} r={20} color={B.mint} spin={t * 120} />
        </g>
      ) : null}
      <g transform={`translate(${EDITOR.w - 120} 40) scale(${pop(t, DEG.yapay + 0.3)})`}>
        <rect x={-62} y={-22} width={124} height={44} rx={22} fill={B.ink} />
        <text y={9} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={22} fill={B.mint}>
          AI ✦
        </text>
      </g>
    </g>
  );
};

/** Tozlu not kâğıdı: elle yazılmış en son for döngüsü */
const DustyNote: React.FC<{t: number}> = ({t}) => {
  const q = pop(t, DEG.for - 0.25, 0.45);
  const old = prog(t, DEG.hatirlamiyorum, 0.6);
  const rot = -5 - old * 4;
  return (
    <g transform={`translate(330 1150) rotate(${rot}) scale(${q})`}>
      <rect x={-232} y={-122} width={470} height={250} rx={18} fill={B.ink} />
      <rect x={-240} y={-130} width={470} height={250} rx={18} fill={old > 0 ? '#EDE6C9' : B.lemon} stroke={B.ink} strokeWidth={6} />
      <rect x={-50} y={-148} width={100} height={36} rx={6} fill={B.mint} opacity={0.8} transform="rotate(4)" />
      <text x={-206} y={-48} fontFamily={mono} fontWeight={600} fontSize={32} fill={B.ink} opacity={1 - old * 0.5}>
        for (let i = 0;
      </text>
      <text x={-206} y={0} fontFamily={mono} fontWeight={600} fontSize={32} fill={B.ink} opacity={1 - old * 0.5}>
        {'  i < n; i++) {'}
      </text>
      <text x={-206} y={48} fontFamily={mono} fontWeight={600} fontSize={32} fill={B.ink} opacity={1 - old * 0.5}>
        {'}'}
      </text>
      {/* toz ve örümcek ağı */}
      <g opacity={old}>
        <path d="M230 -130 L150 -130 M230 -130 L230 -50 M230 -130 L170 -70 M200 -130 Q205 -100 230 -96 M170 -130 Q178 -82 230 -74" stroke={B.muted} strokeWidth={3} fill="none" />
        {[
          [-150, 80],
          [-40, 96],
          [90, 70],
          [160, 20],
          [-190, 30],
          [40, -90],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={5 + (i % 3) * 2} fill={B.muted} opacity={0.5} />
        ))}
      </g>
      <g transform={`translate(196 76) scale(${pop(t, DEG.bile - 0.2)})`}>
        <circle r={44} fill={B.orange} stroke={B.ink} strokeWidth={6} />
        <text y={18} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={56} fill={B.paper}>
          ?
        </text>
      </g>
    </g>
  );
};

export const Degisti: React.FC = () => {
  const t = useSceneTime('degisti');
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <Editor t={t} />
        <DustyNote t={t} />
      </Stage>
    </AbsoluteFill>
  );
};
