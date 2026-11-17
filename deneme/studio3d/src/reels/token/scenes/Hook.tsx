import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {HOOK, useSceneTime} from '../timeline';
import {CodeIcon, Coin} from './icons';

/* 0–4,6 sn · "Sadece iyi bir yazılımcı olmak, artık yazılım sektöründe para kazanmak için yeterli olmayabilir." */

/** Cam kavanoz: paralar girer, "yeterli olmayabilir"de boşalır */
const Jar: React.FC<{t: number}> = ({t}) => {
  const drain = prog(t, HOOK.yeterli, 0.5);
  const shake = t > HOOK.yeterli && t < HOOK.yeterli + 0.6 ? Math.sin((t - HOOK.yeterli) * 40) * 5 : 0;
  const q = pop(t, HOOK.olmayabilir, 0.4);
  return (
    <g transform={`translate(905 1060) rotate(${shake}) scale(${pop(t, 0.5)})`}>
      {[0, 1, 2].map((i) => {
        const drop = prog(t, HOOK.para + i * 0.18, 0.35);
        return <Coin key={i} x={-26 + i * 26} y={-150 + drop * (150 - i * 22) + drain * -260} s={0.62} opacity={drop > 0 ? 1 - drain : 0} />;
      })}
      <rect x={-78} y={-96} width={156} height={170} rx={34} fill={B.sky} fillOpacity={0.55} stroke={B.ink} strokeWidth={6} />
      <rect x={-62} y={-118} width={124} height={26} rx={10} fill={B.orange} stroke={B.ink} strokeWidth={6} />
      <path d="M-50 -70 V30" stroke={B.white} strokeWidth={8} strokeLinecap="round" opacity={0.8} />
      <g transform={`translate(64 -112) scale(${q})`}>
        <circle r={38} fill={B.orange} stroke={B.ink} strokeWidth={6} />
        <text y={16} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={48} fill={B.paper}>
          ?
        </text>
      </g>
    </g>
  );
};

export const Hook: React.FC = () => {
  const t = useSceneTime('hook');
  const bob = (k: number) => Math.sin(t * 2.4 + k) * 10;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <circle cx={540} cy={1250} r={340 * pop(t, 0.1, 0.5)} fill={B.lemon} />
        <g transform={`translate(170 ${1040 + bob(0)}) scale(${pop(t, 0.35)})`}>
          <circle r={84} fill={B.mint} stroke={B.ink} strokeWidth={7} />
          <CodeIcon s={1.1} />
        </g>
        <Jar t={t} />
        <Sparkle x={230} y={1330} r={28} spin={t * 50} scale={pop(t, 0.7)} />
        <Sparkle x={860} y={1360} r={22} color={B.mint} spin={-t * 60} scale={pop(t, 0.9)} />
      </Stage>
    </AbsoluteFill>
  );
};
