import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeInOut, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {DEGER, SCENES, useSceneTime} from '../timeline';
import {Bulb, CodeIcon, Label} from './icons';

/* 11–14,4 sn · "Artık kod yazmak değil, ne yazacağını bilmek daha değerli hâle geliyor."
   Terazi: sol kefede kod, sağ kefede fikir (ampul). Sağ taraf ağır basar. */

const PIVOT = {x: 560, y: 650};
const ARM = 300;
const DROP = 150;

const Pan: React.FC<{x: number; y: number; children: React.ReactNode}> = ({x, y, children}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M0 ${-DROP} L-80 0 M0 ${-DROP} L80 0`} stroke={B.ink} strokeWidth={5} />
    <path d="M-104 0 H104 Q96 44 0 44 Q-96 44 -104 0 Z" fill={B.paper} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
    {children}
  </g>
);

export const Deger: React.FC = () => {
  const t = useSceneTime('deger');
  const tilt = 15 * easeInOut(prog(t, DEGER.bilmek, 0.6)) - 8 * Math.sin(Math.PI * prog(t, DEGER.kodYazmak, 0.5));
  const a = (tilt * Math.PI) / 180;
  const end = (side: -1 | 1) => ({x: PIVOT.x + side * ARM * Math.cos(a), y: PIVOT.y + side * ARM * Math.sin(a) + DROP});
  const left = end(-1);
  const right = end(1);
  const glow = prog(t, DEGER.degerli, 0.4);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} opacity={0.1} />
      <Stage>
        <g transform={`translate(0 ${(1 - pop(t, SCENES.deger[0] + 0.1, 0.5)) * 60})`}>
          <path d={`M${PIVOT.x} ${PIVOT.y} V1010 M${PIVOT.x - 90} 1014 H${PIVOT.x + 90}`} stroke={B.ink} strokeWidth={12} strokeLinecap="round" />
          <g transform={`rotate(${tilt} ${PIVOT.x} ${PIVOT.y})`}>
            <rect x={PIVOT.x - ARM - 10} y={PIVOT.y - 9} width={ARM * 2 + 20} height={18} rx={9} fill={B.orange} stroke={B.ink} strokeWidth={6} />
          </g>
          <circle cx={PIVOT.x} cy={PIVOT.y} r={20} fill={B.ink} />
          <Pan x={left.x} y={left.y}>
            <g transform={`scale(${pop(t, DEGER.kodYazmak)})`}>
              <CodeIcon y={-46} s={0.9} />
              <Label y={88} size={34}>
                Kod yazmak
              </Label>
            </g>
          </Pan>
          <Pan x={right.x} y={right.y}>
            <g transform={`scale(${pop(t, DEGER.ne)})`}>
              <Bulb y={-62} s={0.95} glow={glow} />
              <Label y={88} size={34}>
                Ne yazacağını
              </Label>
              <Label y={128} size={34}>
                bilmek
              </Label>
            </g>
          </Pan>
        </g>
        <Sparkle x={right.x + 120} y={right.y - 140} r={26} color={B.paper} spin={t * 60} scale={pop(t, DEGER.degerli)} />
        <Sparkle x={right.x - 130} y={right.y - 170} r={18} spin={-t * 60} scale={pop(t, DEGER.degerli + 0.15)} />
      </Stage>
    </AbsoluteFill>
  );
};
