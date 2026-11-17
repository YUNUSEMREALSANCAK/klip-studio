import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, body, easeInOut, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Stage} from '../../../kit2d/ui';
import {TERRA, useSceneTime} from '../timeline';
import {Cursor} from '../../../kit2d/shapes';

/* 02 · OpenAI GPT-6.1 Terra: monitörde imleç kendi kendine pencereler arasında gezer, tıklar, formu gönderir */

const SCREEN = {x: 132, y: 492, w: 816, h: 496};

type Win = {x: number; y: number; w: number; h: number; bar: string; title: string; at: number};
const WINDOWS: Win[] = [
  {x: 166, y: 530, w: 400, h: 270, bar: B.orange, title: 'Posta', at: 14.55},
  {x: 500, y: 590, w: 410, h: 280, bar: B.mint, title: 'Takvim', at: 14.75},
  {x: 290, y: 690, w: 450, h: 270, bar: B.lemon, title: 'Form', at: 14.95},
];

/** İmleç yolu: [sn, x, y, tıklama] */
const PATH: [number, number, number, boolean][] = [
  [14.6, 840, 940, false],
  [15.5, 380, 610, true],
  [16.4, 700, 660, true],
  [17.3, 520, 880, true],
  [21.6, 600, 900, false],
  [TERRA.uygulamalar + 0.1, 720, 650, true],
  [TERRA.gecis + 0.1, 470, 760, true],
  [24.5, 420, 820, false],
  [TERRA.islem + 0.15, 625, 905, true],
  [26.9, 640, 930, false],
];

const cursorAt = (t: number) => {
  let i = 0;
  while (i + 1 < PATH.length && PATH[i + 1][0] <= t) i++;
  const a = PATH[i];
  const b = PATH[Math.min(i + 1, PATH.length - 1)];
  const k = b[0] === a[0] ? 1 : easeInOut(Math.min(1, Math.max(0, (t - a[0]) / Math.min(0.6, b[0] - a[0]))));
  return {x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k};
};

const focusAt = (t: number) => (t < TERRA.uygulamalar + 0.1 ? 2 : t < TERRA.gecis + 0.1 ? 1 : 2);

const WindowView: React.FC<{w: Win; i: number; t: number; focused: boolean}> = ({w, i, t, focused}) => {
  const s = pop(t, w.at) * (focused ? 1 : 0.95);
  const typed = Math.round(Math.min(1, prog(t, 24.4, 0.6)) * 3);
  const sent = prog(t, TERRA.islem + 0.2, 0.3);
  return (
    <g transform={`translate(${w.x + w.w / 2} ${w.y + w.h / 2}) scale(${s}) translate(${-w.w / 2} ${-w.h / 2})`} opacity={focused ? 1 : 0.9}>
      <rect x={6} y={8} width={w.w} height={w.h} rx={18} fill={B.ink} />
      <rect width={w.w} height={w.h} rx={18} fill={B.white} stroke={B.ink} strokeWidth={5} />
      <path d={`M0 18 Q0 0 18 0 H${w.w - 18} Q${w.w} 0 ${w.w} 18 V48 H0 Z`} fill={w.bar} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
      <text x={22} y={34} fontFamily={mono} fontWeight={600} fontSize={22} fill={B.ink}>
        {w.title}
      </text>
      {i === 0
        ? [0, 1, 2, 3].map((r) => <rect key={r} x={24} y={74 + r * 46} width={w.w - (r % 2 ? 120 : 60)} height={18} rx={9} fill={B.paper} stroke={B.ink3} strokeWidth={2} />)
        : null}
      {i === 1
        ? Array.from({length: 12}, (_, c) => (
            <rect key={c} x={24 + (c % 4) * 92} y={70 + Math.floor(c / 4) * 64} width={80} height={52} rx={8} fill={c === 6 ? B.orange : B.paper} stroke={B.ink3} strokeWidth={2} />
          ))
        : null}
      {i === 2 ? (
        <>
          {[0, 1].map((r) => (
            <g key={r}>
              <rect x={24} y={72 + r * 62} width={w.w - 48} height={44} rx={10} fill={B.paper} stroke={B.ink} strokeWidth={3} />
              {typed > r ? <rect x={40} y={86 + r * 62} width={[180, 240][r]} height={16} rx={8} fill={B.ink3} /> : null}
            </g>
          ))}
          <rect x={w.w - 190} y={204} width={166} height={50} rx={25} fill={sent > 0 ? B.mintDark : B.ink} />
          <text x={w.w - 107} y={237} textAnchor="middle" fontFamily={body} fontWeight={600} fontSize={24} fill={B.paper}>
            {sent > 0 ? 'Gönderildi' : 'Gönder'}
          </text>
        </>
      ) : null}
    </g>
  );
};

export const Terra: React.FC = () => {
  const t = useSceneTime('terra');
  const mon = pop(t, 13.9, 0.5);
  const focus = focusAt(t);
  const order = [0, 1, 2].filter((i) => i !== focus).concat(focus);
  const c = cursorAt(t);
  const clicks = PATH.filter((p) => p[3]);
  const scan = prog(t, TERRA.ekrani, 0.7);
  const showCursor = t > 14.6;
  const done = pop(t, TERRA.islem + 0.3);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} opacity={0.1} />
      <Stage>
        <g transform={`translate(540 760) scale(${mon}) translate(-540 -760)`}>
          <rect x={470} y={1008} width={140} height={56} fill={B.ink} />
          <rect x={430} y={1056} width={220} height={26} rx={13} fill={B.ink} />
          <rect x={118} y={484} width={860} height={540} rx={34} fill={B.ink} />
          <rect x={110} y={470} width={860} height={540} rx={34} fill={B.ink} />
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx={16} fill={B.paper} />
          <clipPath id="terra-screen">
            <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx={16} />
          </clipPath>
          <g clipPath="url(#terra-screen)">
            {order.map((i) => (
              <WindowView key={i} w={WINDOWS[i]} i={i} t={t} focused={i === focus} />
            ))}
            {scan > 0 && scan < 1 ? (
              <g opacity={Math.sin(Math.PI * scan)}>
                <rect x={SCREEN.x} y={SCREEN.y + scan * SCREEN.h - 60} width={SCREEN.w} height={60} fill={B.mint} opacity={0.35} />
                <rect x={SCREEN.x} y={SCREEN.y + scan * SCREEN.h - 6} width={SCREEN.w} height={6} fill={B.mintDark} />
              </g>
            ) : null}
            {clicks.map(([at, x, y], i) => {
              const r = prog(t, at, 0.45);
              return r > 0 && r < 1 ? <circle key={i} cx={x} cy={y} r={14 + r * 46} fill="none" stroke={B.orange} strokeWidth={6 * (1 - r)} /> : null;
            })}
            {done > 0 ? (
              <g transform={`translate(780 540) scale(${done})`}>
                <rect x={-120} y={-30} width={240} height={60} rx={30} fill={B.ink} />
                <path d="M-90 0 L-78 12 L-56 -12" stroke={B.mint} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x={-40} y={10} fontFamily={body} fontWeight={600} fontSize={26} fill={B.paper}>
                  Tamamlandı
                </text>
              </g>
            ) : null}
          </g>
          {showCursor ? (
            <g opacity={easeOut(prog(t, 14.6, 0.3))}>
              <Cursor x={c.x} y={c.y} s={1.3} />
              <g transform={`translate(${c.x + 52} ${c.y + 62})`}>
                <rect x={0} y={0} width={64} height={36} rx={18} fill={B.mint} stroke={B.ink} strokeWidth={4} />
                <text x={32} y={26} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={20} fill={B.ink}>
                  AI
                </text>
              </g>
            </g>
          ) : null}
        </g>
      </Stage>
    </AbsoluteFill>
  );
};
