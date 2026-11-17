import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {GENIE, useSceneTime} from '../timeline';
import {MiniKey} from '../../../kit2d/shapes';

/* 04 · Google DeepMind Genie 4: yazılan bir cümleden katman katman kurulan, içinde gezilebilen bir dünya */

const PROMPT = 'karlı bir dağ köyü';
const FRAME = {x: 110, y: 640, w: 860, h: 380};

const rise = (t: number, at: number) => (1 - easeOut(prog(t, at, 0.55))) * 320;

const Pine: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-6} y={0} width={12} height={22} fill={B.ink} />
    <path d="M0 -86 L36 -26 H18 L44 12 H-44 L-18 -26 H-36 Z" fill={B.mintDark} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
    <path d="M0 -86 L14 -62 H-14 Z" fill={B.paper} />
  </g>
);

const House: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-44} y={-60} width={88} height={60} fill={B.orange} stroke={B.ink} strokeWidth={5} />
    <path d="M-58 -56 L0 -106 L58 -56 Z" fill={B.ink} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
    <path d="M-50 -60 L0 -102 L50 -60" stroke={B.paper} strokeWidth={8} fill="none" strokeLinejoin="round" />
    <rect x={-30} y={-46} width={22} height={22} rx={3} fill={B.lemon} stroke={B.ink} strokeWidth={4} />
    <rect x={8} y={-40} width={22} height={40} rx={3} fill={B.ink2} />
  </g>
);

export const Genie: React.FC = () => {
  const t = useSceneTime('genie');
  const box = pop(t, 41.0, 0.45);
  const chars = Math.round(Math.min(1, prog(t, GENIE.cumle, 1.1)) * PROMPT.length);
  const caret = Math.floor(t * 2.5) % 2 === 0;
  const enterKey = pop(t, 43.45, 0.3);
  const press = prog(t, GENIE.donusturuyor - 0.1, 0.1) - prog(t, GENIE.donusturuyor, 0.15);
  const world = GENIE.donusturuyor;
  const frame = pop(t, world - 0.15, 0.4);
  const pan = Math.max(0, t - GENIE.tek) * 1;
  const far = -pan * 30;
  const mid = -pan * 70;
  const near = -pan * 130;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <g transform={`translate(540 530) scale(${box}) translate(-540 -530)`}>
          <rect x={116} y={478} width={760} height={120} rx={32} fill={B.ink} />
          <rect x={110} y={470} width={760} height={120} rx={32} fill={B.white} stroke={B.ink} strokeWidth={6} />
          <Sparkle x={168} y={530} r={22} color={B.orange} spin={t * 30} />
          <text x={212} y={546} fontFamily={mono} fontSize={42} fill={B.ink}>
            {PROMPT.slice(0, chars)}
            {caret && t < world ? '|' : ''}
          </text>
        </g>
        <MiniKey x={928} y={530 + press * 10} w={96} label="↵" scale={enterKey} />
        <g transform={`translate(540 830) scale(${frame}) translate(-540 -830)`}>
          <clipPath id="genie-world">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={30} />
          </clipPath>
          <g clipPath="url(#genie-world)">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill={B.sky} />
            <circle cx={800 + far * 0.5} cy={760 + rise(t, world) * 0.6} r={56} fill={B.lemon} stroke={B.ink} strokeWidth={5} />
            <g transform={`translate(${far} ${rise(t, world + 0.1)})`}>
              {[0, 1, 2].map((k) => (
                <g key={k} transform={`translate(${k * 700} 0)`}>
                  <path d="M60 1020 L300 760 L440 900 L560 790 L820 1020 Z" fill={B.ink3} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
                  <path d="M300 760 L350 815 L320 830 L290 812 L262 802 Z M560 790 L600 834 L566 846 L540 822 Z" fill={B.paper} />
                </g>
              ))}
            </g>
            <g transform={`translate(${mid} ${rise(t, world + 0.3)})`}>
              {[0, 1, 2].map((k) => (
                <path key={k} d={`M${k * 900} 1020 Q${k * 900 + 220} 880 ${k * 900 + 450} 930 Q${k * 900 + 700} 980 ${k * 900 + 900} 900 V1030 H${k * 900} Z`} fill={B.paper} stroke={B.ink} strokeWidth={5} />
              ))}
              {[180, 420, 690, 1020, 1300, 1560].map((x, i) => (
                <Pine key={x} x={x} y={960 + (i % 2) * 18} s={pop(t, world + 0.5 + i * 0.07) * (0.8 + (i % 3) * 0.12)} />
              ))}
            </g>
            <g transform={`translate(${near} ${rise(t, world + 0.55)})`}>
              {[330, 560, 880, 1240, 1520].map((x, i) => (
                <House key={x} x={x} y={1010} s={pop(t, world + 0.7 + i * 0.08) * (0.9 + (i % 2) * 0.15)} />
              ))}
              <rect x={0} y={1004} width={2200} height={30} fill={B.paper} stroke={B.ink} strokeWidth={5} />
            </g>
            {t > world + 0.6
              ? Array.from({length: 26}, (_, i) => {
                  const sx = FRAME.x + ((i * 137) % FRAME.w);
                  const sy = FRAME.y + (((t - world) * (40 + (i % 5) * 12) + i * 53) % FRAME.h);
                  return <circle key={i} cx={sx + Math.sin(t * 2 + i) * 10} cy={sy} r={4 + (i % 3)} fill={B.white} stroke={B.ink3} strokeWidth={1.5} />;
                })
              : null}
          </g>
          <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={30} fill="none" stroke={B.ink} strokeWidth={6} />
        </g>
      </Stage>
    </AbsoluteFill>
  );
};
