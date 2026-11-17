import React from 'react';
import {B, display} from '../../../kit2d/brand';

/* Bu reele özel küçük çizimler (ortak olanlar kit2d/shapes.tsx'te) */

export const CodeBadge: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle r={72} fill={B.mint} stroke={B.ink} strokeWidth={7} />
    <path d="M-22 -26 L-46 0 L-22 26 M22 -26 L46 0 L22 26 M8 -34 L-8 34" stroke={B.ink} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export const Shield: React.FC<{x: number; y: number; s: number; check: number}> = ({x, y, s, check}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 -78 L62 -54 V2 Q62 52 0 82 Q-62 52 -62 2 V-54 Z" fill={B.orange} stroke={B.ink} strokeWidth={7} strokeLinejoin="round" />
    <path
      d="M-26 2 L-6 22 L30 -18"
      stroke={B.paper}
      strokeWidth={12}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={90}
      strokeDashoffset={90 * (1 - check)}
    />
  </g>
);

export const BigText: React.FC<{x: number; y: number; size: number; color: string; children: React.ReactNode; anchor?: 'start' | 'middle'}> = ({
  x,
  y,
  size,
  color,
  children,
  anchor = 'start',
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display} fontWeight={800} fontSize={size} letterSpacing={-size * 0.03} fill={color}>
    {children}
  </text>
);
