import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {B, clamp, mono} from './brand';

/* Reels arasında ortak küçük 2D çizimler ve sahne geçişi */

export const MiniKey: React.FC<{x: number; y: number; w?: number; label: string; rot?: number; scale?: number}> = ({x, y, w = 120, label, rot = 0, scale = 1}) => {
  const h = w * 0.8;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale}) translate(${-w / 2} ${-h / 2})`}>
      <path d={`M-4 ${h} H${w + 4} L${w + 2} ${h + 10} H-2 Z`} fill={B.orangeDark} />
      <path d={`M${w * 0.1} ${h * 0.18} H${w * 0.9} L${w} ${h} H0 Z`} fill={B.orange} stroke={B.orange} strokeWidth={10} strokeLinejoin="round" />
      <path d={`M${w * 0.18} 0 H${w * 0.82} L${w * 0.9} ${h * 0.18} H${w * 0.1} Z`} fill={B.orangeLight} stroke={B.orangeLight} strokeWidth={8} strokeLinejoin="round" />
      <text x={w / 2} y={h * 0.78} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={w * 0.36} fill={B.ink}>
        {label}
      </text>
    </g>
  );
};

/** Bir sahneye kayarak giriş (önceki sahnenin üstüne) */
export const SceneShell: React.FC<{children: React.ReactNode; first: boolean; dur: number}> = ({children, first, dur}) => {
  const f = useCurrentFrame();
  const p = first ? 1 : interpolate(f, [0, dur * 30], [0, 1], clamp);
  const e = 1 - Math.pow(1 - p, 3);
  return (
    <AbsoluteFill style={{transform: `translateX(${(1 - e) * 100}%)`, boxShadow: p < 1 ? '-30px 0 0 #FF5A1F' : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

export const Scale: React.FC<{x: number; y: number; s: number; tip?: number}> = ({x, y, s, tip = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle r={78} fill={B.lemon} stroke={B.ink} strokeWidth={7} />
    <path d="M0 -44 V40 M-26 44 H26" stroke={B.ink} strokeWidth={7} strokeLinecap="round" />
    <g transform={`rotate(${tip})`}>
      <path d="M-46 -30 H46" stroke={B.ink} strokeWidth={7} strokeLinecap="round" />
      <path d="M-46 -30 L-60 4 H-32 Z M46 -30 L32 4 H60 Z" fill={B.paper} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
    </g>
    <circle cy={-46} r={7} fill={B.ink} />
  </g>
);

export const Cursor: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0 L0 46 L12 35 L21 54 L30 50 L21 31 L37 31 Z" fill={B.ink} stroke={B.paper} strokeWidth={4} strokeLinejoin="round" />
  </g>
);

export const Hex: React.FC<{x: number; y: number; r: number; fill?: string}> = ({x, y, r, fill = B.orange}) => {
  const pts = Array.from({length: 6}, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />;
};
