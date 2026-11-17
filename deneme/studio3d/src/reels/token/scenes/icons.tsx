import React from 'react';
import {B, body, mono} from '../../../kit2d/brand';

/* Bu reelin küçük çizimleri. Hepsi (0, 0) merkezli, ~100 birim boyunda. */

type At = {x?: number; y?: number; s?: number; rot?: number; opacity?: number};
const place = ({x = 0, y = 0, s = 1, rot = 0}: At) => `translate(${x} ${y}) rotate(${rot}) scale(${s})`;
const INK = {stroke: B.ink, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

export const Coin: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <ellipse cx={0} cy={8} rx={40} ry={40} fill={B.orangeDark} {...INK} />
    <circle r={40} fill={B.lemon} {...INK} />
    <circle r={25} fill="none" stroke={B.orangeDark} strokeWidth={5} />
    <path d="M-6 -12 V12 M6 -12 V12" stroke={B.orangeDark} strokeWidth={6} strokeLinecap="round" />
  </g>
);

export const TokenChip: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <rect x={-52} y={-28} width={104} height={56} rx={28} fill={B.mint} {...INK} />
    <text y={10} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={26} fill={B.ink}>
      tok
    </text>
  </g>
);

export const CodeIcon: React.FC<At & {color?: string}> = ({color = B.ink, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-22 -26 L-46 0 L-22 26 M22 -26 L46 0 L22 26 M8 -34 L-8 34" stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export const Bulb: React.FC<At & {glow?: number}> = ({glow = 0, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    {glow > 0 ? <circle cy={-14} r={62 + glow * 16} fill={B.lemon} opacity={0.35 * glow} /> : null}
    <path d="M-34 -18 A40 40 0 1 1 34 -18 Q34 4 18 18 V30 H-18 V18 Q-34 4 -34 -18 Z" fill={B.lemon} {...INK} />
    <path d="M-16 42 H16 M-12 54 H12" {...INK} />
    <path d="M-10 6 L0 -8 L10 6" fill="none" stroke={B.orange} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export const Heart: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M0 40 C-60 0 -52 -46 -22 -46 C-8 -46 0 -36 0 -28 C0 -36 8 -46 22 -46 C52 -46 60 0 0 40 Z" fill={B.orange} {...INK} />
    <path d="M0 -20 V8 M-14 -6 H14" stroke={B.paper} strokeWidth={8} strokeLinecap="round" />
  </g>
);

export const Gavel: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <g transform="rotate(-35)">
      <rect x={-8} y={-6} width={16} height={70} rx={6} fill={B.orangeLight} {...INK} />
      <rect x={-40} y={-40} width={80} height={36} rx={10} fill={B.orange} {...INK} />
    </g>
    <rect x={-46} y={38} width={70} height={14} rx={7} fill={B.ink3} {...INK} />
  </g>
);

export const Cap: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-30 0 V24 Q0 40 30 24 V0" fill={B.ink3} {...INK} />
    <path d="M0 -36 L56 -12 L0 12 L-56 -12 Z" fill={B.ink} {...INK} />
    <path d="M40 -6 V26" stroke={B.lemon} strokeWidth={5} strokeLinecap="round" />
    <circle cx={40} cy={30} r={6} fill={B.lemon} />
  </g>
);

export const Dumbbell: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <rect x={-34} y={-6} width={68} height={12} rx={6} fill={B.ink3} {...INK} />
    <rect x={-58} y={-30} width={22} height={60} rx={8} fill={B.mint} {...INK} />
    <rect x={36} y={-30} width={22} height={60} rx={8} fill={B.mint} {...INK} />
    <rect x={-74} y={-18} width={16} height={36} rx={6} fill={B.mint} {...INK} />
    <rect x={58} y={-18} width={16} height={36} rx={6} fill={B.mint} {...INK} />
  </g>
);

export const Trophy: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-38 -34 Q-66 -34 -60 -8 Q-54 12 -26 10 M38 -34 Q66 -34 60 -8 Q54 12 26 10" fill="none" {...INK} />
    <path d="M-40 -44 H40 V-8 Q40 26 0 30 Q-40 26 -40 -8 Z" fill={B.lemon} {...INK} />
    <path d="M-10 30 H10 V46 H-10 Z" fill={B.lemon} {...INK} />
    <rect x={-30} y={46} width={60} height={16} rx={5} fill={B.ink} />
    <path d="M0 -30 L5 -18 L18 -18 L8 -10 L12 2 L0 -6 L-12 2 L-8 -10 L-18 -18 L-5 -18 Z" fill={B.orange} />
  </g>
);

export const Magnifier: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M42 42 L78 78" stroke={B.ink} strokeWidth={18} strokeLinecap="round" />
    <circle r={58} fill={B.paper} fillOpacity={0.25} stroke={B.ink} strokeWidth={12} />
    <circle r={58} fill="none" stroke={B.lemon} strokeWidth={4} />
    <path d="M-30 -18 A36 36 0 0 1 -10 -34" stroke={B.white} strokeWidth={6} fill="none" strokeLinecap="round" />
  </g>
);

export const Person: React.FC<At & {color?: string}> = ({color = B.mint, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-44 70 Q-44 14 0 14 Q44 14 44 70 Z" fill={color} {...INK} />
    <circle cy={-22} r={30} fill={B.orangeLight} {...INK} />
  </g>
);

/** Beyaz kart, mürekkep gölgeli (merkezli) */
export const Card: React.FC<{x: number; y: number; w: number; h: number; fill?: string; r?: number; children?: React.ReactNode; s?: number; rot?: number; opacity?: number}> = ({
  x,
  y,
  w,
  h,
  fill = B.white,
  r = 28,
  children,
  s = 1,
  rot = 0,
  opacity,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
    <rect x={-w / 2 + 8} y={-h / 2 + 10} width={w} height={h} rx={r} fill={B.ink} />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill={fill} stroke={B.ink} strokeWidth={6} />
    {children}
  </g>
);

export const Label: React.FC<{x?: number; y: number; size?: number; color?: string; children: React.ReactNode; weight?: number; anchor?: 'start' | 'middle' | 'end'}> = ({
  x = 0,
  y,
  size = 34,
  color = B.ink,
  children,
  weight = 800,
  anchor = 'middle',
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={body} fontWeight={weight} fontSize={size} fill={color}>
    {children}
  </text>
);
