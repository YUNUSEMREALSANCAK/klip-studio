import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Stage} from '../../../kit2d/ui';
import {END, useSceneTime} from '../timeline';
import {Cursor, Hex} from '../../../kit2d/shapes';

/* Kapanış öncesi: 5 haber küçük kartlarda, sırayla vurgulanır; yorum balonu */

const CARDS = [
  {x: 230, y: 610, n: '01'},
  {x: 540, y: 610, n: '02'},
  {x: 850, y: 610, n: '03'},
  {x: 385, y: 860, n: '04'},
  {x: 695, y: 860, n: '05'},
];

const Icon: React.FC<{i: number}> = ({i}) => {
  switch (i) {
    case 0:
      return <Hex x={0} y={14} r={44} />;
    case 1:
      return <Cursor x={-18} y={-22} s={1.3} />;
    case 2:
      return <path d="M-56 44 L-24 10 L0 26 L54 -30" stroke={B.orange} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    case 3:
      return (
        <>
          <path d="M-62 46 L-14 -24 L14 10 L30 -10 L66 46 Z" fill={B.ink3} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
          <path d="M-14 -24 L0 -4 L-22 -2 Z" fill={B.paper} />
        </>
      );
    default:
      return (
        <>
          <path d="M0 -40 V40 M-22 44 H22 M-44 -24 H44" stroke={B.ink} strokeWidth={7} strokeLinecap="round" />
          <path d="M-44 -24 L-58 8 H-30 Z M44 -24 L30 8 H58 Z" fill={B.lemon} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
        </>
      );
  }
};

export const End: React.FC = () => {
  const t = useSceneTime('end');
  const bubble = pop(t, END.yorumlara, 0.4);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} opacity={0.1} />
      <Stage>
        {CARDS.map((c, i) => {
          const s = pop(t, END.peki + 0.1 + i * 0.1);
          const scanAt = END.hangisi + i * 0.24;
          const hi = Math.sin(Math.PI * prog(t, scanAt, 0.36));
          const wig = t > END.sasirtti && t < END.sasirtti + 0.8 ? Math.sin((t - END.sasirtti) * 30 + i) * 4 : 0;
          return (
            <g key={c.n} transform={`translate(${c.x} ${c.y}) scale(${s * (1 + hi * 0.1)}) rotate(${wig})`}>
              <rect x={-126} y={-104} width={252} height={220} rx={28} fill={B.ink} />
              <rect x={-132} y={-112} width={252} height={220} rx={28} fill={hi > 0.3 ? B.paper : B.white} stroke={B.ink} strokeWidth={6} />
              <rect x={-112} y={-94} width={74} height={40} rx={20} fill={B.ink} />
              <text x={-75} y={-66} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={22} fill={B.mint}>
                {c.n}
              </text>
              <g transform="translate(-6 10)">
                <Icon i={i} />
              </g>
            </g>
          );
        })}
        <g transform={`translate(880 1150) scale(${bubble})`}>
          <path d="M-90 -64 H90 Q118 -64 118 -36 V30 Q118 58 90 58 H-20 L-58 92 L-50 58 H-90 Q-118 58 -118 30 V-36 Q-118 -64 -90 -64 Z" fill={B.white} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
          {[0, 1, 2].map((d) => (
            <circle key={d} cx={-40 + d * 40} cy={-4 - Math.max(0, Math.sin(t * 9 - d)) * 10} r={12} fill={B.orange} />
          ))}
        </g>
      </Stage>
    </AbsoluteFill>
  );
};
