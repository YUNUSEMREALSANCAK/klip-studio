import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, TOKEN, useSceneTime} from '../timeline';
import {Coin, TokenChip} from './icons';

/* 14,4–18,3 sn · "Bence artık asıl değerli olan, yapay zekânın ürettiği tokenleri paraya çevirebilmek."
   Tokenler yukarıdan makineye dökülür, makine çalışır, soldan para çıkar ve üst üste dizilir. */

const M = {x: 500, y: 790, w: 380, h: 280};
const TOKENS = 9;
const COINS = 7;
const tokenAt = (i: number) => TOKEN.yapay - 0.3 + i * 0.28;
const coinAt = (i: number) => TOKEN.paraya + i * 0.2;

const Gear: React.FC<{x: number; y: number; r: number; spin: number; fill: string}> = ({x, y, r, spin, fill}) => (
  <g transform={`translate(${x} ${y}) rotate(${spin})`}>
    {Array.from({length: 8}, (_, i) => (
      <rect key={i} x={-r * 0.18} y={-r - 12} width={r * 0.36} height={24} rx={4} fill={fill} stroke={B.ink} strokeWidth={4} transform={`rotate(${i * 45})`} />
    ))}
    <circle r={r} fill={fill} stroke={B.ink} strokeWidth={5} />
    <circle r={r * 0.35} fill={B.ink} />
  </g>
);

export const Token: React.FC = () => {
  const t = useSceneTime('token');
  const run = prog(t, TOKEN.tokenleri, 0.3);
  const shake = run > 0 && t < TOKEN.cevirebilmek + 0.8 ? Math.sin(t * 46) * 3 * run : 0;
  const spin = run * (t - TOKEN.tokenleri) * 220;
  const intro = pop(t, SCENES.token[0] + 0.1, 0.5);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.ink} dot={B.paper} opacity={0.08} />
      <Stage>
        {/* Huni ve akan tokenler */}
        {Array.from({length: TOKENS}, (_, i) => {
          const p = prog(t, tokenAt(i), 0.55);
          if (p <= 0 || p >= 1) return null;
          const x = M.x + (i % 3 - 1) * 70 * (1 - p);
          const y = 530 + easeOut(p) * 200;
          return <TokenChip key={i} x={x} y={y} s={0.9 - p * 0.35} rot={(i % 2 ? 1 : -1) * (14 - p * 14)} />;
        })}
        <g transform={`translate(${M.x + shake} ${M.y}) scale(${intro}) translate(${-M.x} ${-M.y})`}>
          <path d={`M${M.x - 150} 620 H${M.x + 150} L${M.x + 60} ${M.y - M.h / 2} H${M.x - 60} Z`} fill={B.ink3} stroke={B.paper} strokeWidth={6} strokeLinejoin="round" />
          <rect x={M.x - M.w / 2} y={M.y - M.h / 2} width={M.w} height={M.h} rx={36} fill={B.orange} stroke={B.paper} strokeWidth={6} />
          <rect x={M.x - 140} y={M.y - 100} width={280} height={150} rx={24} fill={B.ink} stroke={B.paper} strokeWidth={5} />
          <Gear x={M.x - 50} y={M.y - 26} r={40} spin={spin} fill={B.mint} />
          <Gear x={M.x + 52} y={M.y - 4} r={30} spin={-spin * 1.3} fill={B.lemon} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={M.x - 60 + i * 60} cy={M.y + 96} r={13} fill={run > 0 && Math.floor(t * 6 + i) % 3 === 0 ? B.lemon : B.orangeDark} stroke={B.ink} strokeWidth={4} />
          ))}
          {/* Çıkış oluğu (sol) */}
          <path d={`M${M.x - M.w / 2} ${M.y + 70} H${M.x - M.w / 2 - 90} L${M.x - M.w / 2 - 120} ${M.y + 130} H${M.x - M.w / 2}`} fill={B.ink3} stroke={B.paper} strokeWidth={6} strokeLinejoin="round" />
          <text x={M.x} y={M.y + 150 - 10} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={22} letterSpacing={3} fill={B.ink}>
            TOKEN → PARA
          </text>
        </g>
        {/* Para yığını */}
        {Array.from({length: COINS}, (_, i) => {
          const p = prog(t, coinAt(i), 0.4);
          if (p <= 0) return null;
          const fromX = M.x - M.w / 2 - 110;
          const fromY = M.y + 120;
          const toX = 190 + (i % 2) * 8;
          const toY = 1440 - i * 34;
          const k = easeOut(p);
          const arc = Math.sin(Math.PI * p) * 70;
          return <Coin key={i} x={fromX + (toX - fromX) * k} y={fromY + (toY - fromY) * k - arc} s={1.1} rot={(1 - p) * 180} />;
        })}
        <Sparkle x={300} y={1220} r={26} color={B.lemon} spin={t * 60} scale={pop(t, TOKEN.cevirebilmek)} />
        <Sparkle x={110} y={1080} r={18} color={B.mint} spin={-t * 60} scale={pop(t, TOKEN.cevirebilmek + 0.2)} />
      </Stage>
    </AbsoluteFill>
  );
};
