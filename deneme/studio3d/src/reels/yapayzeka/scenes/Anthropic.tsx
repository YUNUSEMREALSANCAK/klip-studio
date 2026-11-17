import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {ANT, useSceneTime} from '../timeline';

/* 03 · Anthropic halka arz: borsa tabelası "ANT", yükselen grafik, KASIM takvim yaprağı. Fiti spot ışığında. */

const CHART = [
  [0, 0.15],
  [0.12, 0.22],
  [0.24, 0.18],
  [0.36, 0.34],
  [0.48, 0.3],
  [0.6, 0.5],
  [0.72, 0.46],
  [0.84, 0.7],
  [1, 0.92],
];
const BOX = {x: 480, y: 610, w: 450, h: 330};

export const Anthropic: React.FC = () => {
  const t = useSceneTime('anthropic');
  const board = pop(t, 26.7, 0.5);
  const draw = easeOut(prog(t, ANT.anthropic, 2.2));
  const pts = CHART.map(([x, y]) => [BOX.x + x * BOX.w, BOX.y + BOX.h - y * BOX.h] as const);
  const n = Math.max(1, Math.ceil(draw * (pts.length - 1)));
  const visible = pts.slice(0, n + 1).map((p, i) => {
    if (i < n) return p;
    const a = pts[n - 1];
    const k = draw * (pts.length - 1) - (n - 1);
    return [a[0] + (p[0] - a[0]) * k, a[1] + (p[1] - a[1]) * k] as const;
  });
  const end = visible[visible.length - 1];
  const cal = pop(t, ANT.kasim - 0.1, 0.45);
  const spot = pop(t, 26.6, 0.5);
  const burst = pop(t, ANT.gelir, 0.4);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.ink} dot={B.paper} opacity={0.08} />
      <Stage>
        <circle cx={290} cy={1310} r={306 * spot} fill="none" stroke={B.mint} strokeWidth={4} strokeDasharray="6 14" />
        <circle cx={290} cy={1310} r={282 * spot} fill={B.paper} />
        <g transform={`translate(540 735) scale(${board}) translate(-540 -735)`}>
          <rect x={100} y={470} width={880} height={530} rx={34} fill={B.ink2} stroke={B.ink3} strokeWidth={6} />
          <text x={150} y={545} fontFamily={mono} fontWeight={600} fontSize={30} letterSpacing={4} fill={B.mint}>
            NASDAQ
          </text>
          <rect x={150} y={580} width={250} height={56} rx={28} fill={B.orange} />
          <text x={275} y={618} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={24} letterSpacing={2} fill={B.ink}>
            HALKA ARZ
          </text>
          <text x={150} y={850} fontFamily={display} fontWeight={800} fontSize={200} letterSpacing={-6} fill={B.paper}>
            ANT
          </text>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={BOX.x} x2={BOX.x + BOX.w} y1={BOX.y + (i * BOX.h) / 3} y2={BOX.y + (i * BOX.h) / 3} stroke={B.ink3} strokeWidth={3} />
          ))}
          {draw > 0 ? (
            <>
              <path
                d={`M${visible.map((p) => p.join(' ')).join(' L')} L${end[0]} ${BOX.y + BOX.h} L${BOX.x} ${BOX.y + BOX.h} Z`}
                fill={B.orange}
                opacity={0.18}
              />
              <path d={`M${visible.map((p) => p.join(' ')).join(' L')}`} stroke={B.orange} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={end[0]} cy={end[1]} r={14 + Math.sin(t * 8) * 3} fill={B.lemon} stroke={B.ink} strokeWidth={5} />
            </>
          ) : null}
        </g>
        <g transform={`translate(860 470) rotate(8) scale(${cal})`}>
          <rect x={-104} y={-96} width={208} height={200} rx={22} fill={B.white} stroke={B.ink} strokeWidth={6} />
          <path d="M-104 -74 Q-104 -96 -82 -96 H82 Q104 -96 104 -74 V-34 H-104 Z" fill={B.orange} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
          <text y={-52} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={30} letterSpacing={3} fill={B.paper}>
            KASIM
          </text>
          <text y={60} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={76} fill={B.ink}>
            2026
          </text>
        </g>
        <Sparkle x={780} y={1080} r={30} scale={burst} spin={t * 60} />
        <Sparkle x={980} y={1240} r={20} color={B.mint} scale={burst} spin={-t * 70} />
      </Stage>
    </AbsoluteFill>
  );
};
