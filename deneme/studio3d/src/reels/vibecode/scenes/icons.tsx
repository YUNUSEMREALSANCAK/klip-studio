import React from 'react';
import {B, display, mono} from '../../../kit2d/brand';

/* Bu reelin küçük çizimleri. Hepsi (0, 0) merkezli. */

type At = {x?: number; y?: number; s?: number; rot?: number; opacity?: number};
const place = ({x = 0, y = 0, s = 1, rot = 0}: At) => `translate(${x} ${y}) rotate(${rot}) scale(${s})`;
export const INK = {stroke: B.ink, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

export type Glyph = 'play' | 'pen' | 'note' | 'chat' | 'photo' | 'chart';

const GLYPHS: Record<Glyph, React.ReactNode> = {
  play: <path d="M-16 -24 L26 0 L-16 24 Z" fill={B.paper} {...INK} />,
  pen: (
    <g transform="rotate(40)">
      <rect x={-10} y={-34} width={20} height={56} rx={4} fill={B.paper} {...INK} />
      <path d="M-10 22 L0 38 L10 22 Z" fill={B.ink} {...INK} />
    </g>
  ),
  note: (
    <g>
      <path d="M-8 18 V-26 L24 -32 V12" fill="none" {...INK} strokeWidth={7} />
      <circle cx={-16} cy={20} r={11} fill={B.paper} {...INK} />
      <circle cx={16} cy={14} r={11} fill={B.paper} {...INK} />
    </g>
  ),
  chat: <path d="M-30 -22 H30 V14 H-6 L-22 28 V14 H-30 Z" fill={B.paper} {...INK} />,
  photo: (
    <g>
      <rect x={-30} y={-24} width={60} height={48} rx={8} fill={B.paper} {...INK} />
      <path d="M-24 18 L-6 -2 L6 10 L14 2 L26 18" fill="none" {...INK} strokeWidth={5} />
      <circle cx={12} cy={-10} r={6} fill={B.ink} />
    </g>
  ),
  chart: (
    <g>
      <rect x={-28} y={0} width={14} height={26} rx={3} fill={B.paper} {...INK} />
      <rect x={-7} y={-18} width={14} height={44} rx={3} fill={B.paper} {...INK} />
      <rect x={14} y={-32} width={14} height={58} rx={3} fill={B.paper} {...INK} />
    </g>
  ),
};

/** Genel uygulama simgesi (marka logosu değil) */
export const AppTile: React.FC<At & {glyph: Glyph; fill: string; size?: number}> = ({glyph, fill, size = 130, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <rect x={-size / 2 + 6} y={-size / 2 + 10} width={size} height={size} rx={size * 0.26} fill={B.ink} />
    <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.26} fill={fill} {...INK} />
    <g transform={`scale(${size / 130})`}>{GLYPHS[glyph]}</g>
  </g>
);

/** Abonelik fiyat etiketi */
export const PriceTag: React.FC<At & {text: string; fill?: string}> = ({text, fill = B.lemon, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-62 -26 H44 L66 0 L44 26 H-62 Z" fill={fill} {...INK} strokeWidth={5} />
    <circle cx={42} cy={0} r={6} fill={B.ink} />
    <text x={-8} y={10} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={28} fill={B.ink}>
      {text}
    </text>
  </g>
);

export const QMark: React.FC<At & {fill?: string}> = ({fill = B.orange, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <circle r={56} fill={fill} {...INK} strokeWidth={7} />
    <text y={24} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={76} fill={B.paper}>
      ?
    </text>
  </g>
);

/** Kod parantezi baloncuğu */
export const CodeBubble: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <circle r={70} fill={B.mint} {...INK} strokeWidth={7} />
    <path d="M-18 -24 L-40 0 L-18 24 M18 -24 L40 0 L18 24 M7 -30 L-7 30" stroke={B.ink} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/** Instagram tarzı "kaydet" simgesi */
export const Bookmark: React.FC<At & {fill?: number}> = ({fill = 0, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-60 -84 H60 V90 L0 44 L-60 90 Z" fill={B.ink3} stroke={B.paper} strokeWidth={10} strokeLinejoin="round" />
    <clipPath id="bm-fill">
      <rect x={-70} y={90 - 190 * fill} width={140} height={190} />
    </clipPath>
    <path d="M-60 -84 H60 V90 L0 44 L-60 90 Z" fill={B.lemon} clipPath="url(#bm-fill)" />
    <path d="M-60 -84 H60 V90 L0 44 L-60 90 Z" fill="none" stroke={B.paper} strokeWidth={10} strokeLinejoin="round" />
  </g>
);

/** Kâğıt uçak (gönder) */
export const Plane: React.FC<At> = (p) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-70 -6 L72 -58 L26 66 L4 18 Z" fill={B.paper} {...INK} />
    <path d="M4 18 L72 -58" {...INK} fill="none" />
    <path d="M4 18 L8 52 L26 66" fill={B.mint} {...INK} />
  </g>
);

/** Abonelik faturası */
export const Receipt: React.FC<At & {name: string; price: string}> = ({name, price, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <path d="M-120 -80 H120 V70 L100 84 L80 70 L60 84 L40 70 L20 84 L0 70 L-20 84 L-40 70 L-60 84 L-80 70 L-100 84 L-120 70 Z" fill={B.white} {...INK} />
    <text x={-96} y={-34} fontFamily={mono} fontWeight={600} fontSize={22} letterSpacing={3} fill={B.muted}>
      ABONELİK
    </text>
    <text x={-96} y={6} fontFamily={display} fontWeight={800} fontSize={40} fill={B.ink}>
      {name}
    </text>
    <text x={-96} y={50} fontFamily={mono} fontWeight={600} fontSize={30} fill={B.orange}>
      {price}
    </text>
  </g>
);

/** Arkadaş: yuvarlak profil */
export const Friend: React.FC<At & {fill?: string}> = ({fill = B.sky, ...p}) => (
  <g transform={place(p)} opacity={p.opacity}>
    <circle r={78} fill={fill} {...INK} strokeWidth={7} />
    <circle cy={-18} r={26} fill={B.paper} {...INK} />
    <path d="M-44 52 Q0 0 44 52" fill={B.paper} {...INK} />
  </g>
);

/** Basit terazi (büyük boy) */
export const BigScale: React.FC<At & {tip: number; left: React.ReactNode; right: React.ReactNode}> = ({tip, left, right, ...p}) => {
  const a = (tip * Math.PI) / 180;
  const arm = 300;
  const lx = -arm * Math.cos(a);
  const ly = -arm * Math.sin(a);
  return (
    <g transform={place(p)} opacity={p.opacity}>
      <path d="M-110 330 H110 L80 290 H-80 Z" fill={B.ink3} stroke={B.paper} strokeWidth={6} strokeLinejoin="round" />
      <rect x={-14} y={0} width={28} height={300} rx={8} fill={B.ink3} stroke={B.paper} strokeWidth={6} />
      <g transform={`rotate(${tip})`}>
        <rect x={-arm} y={-12} width={arm * 2} height={24} rx={12} fill={B.orange} stroke={B.paper} strokeWidth={6} />
      </g>
      <circle r={30} fill={B.lemon} stroke={B.paper} strokeWidth={6} />
      {[
        {x: lx, y: ly, c: left},
        {x: -lx, y: -ly, c: right},
      ].map((pan, i) => (
        <g key={i} transform={`translate(${pan.x} ${pan.y})`}>
          <path d="M0 0 L-110 150 M0 0 L110 150" stroke={B.paper} strokeWidth={5} />
          <path d="M-140 150 H140 Q130 210 0 214 Q-130 210 -140 150 Z" fill={B.lemon} stroke={B.paper} strokeWidth={6} strokeLinejoin="round" />
          <g transform="translate(0 90)">{pan.c}</g>
        </g>
      ))}
    </g>
  );
};
