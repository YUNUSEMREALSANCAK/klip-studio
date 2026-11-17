import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeBack, easeOut, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {GEL, useSceneTime} from '../timeline';
import {Bulb, CodeIcon, Label, Trophy} from './icons';

/* 44,3–49,5 sn · "Çünkü gelecekte sadece iyi kod yazanlar değil, yapay zekâyı kullanarak
   gerçek problemleri çözenler kazanacak."
   İki sütun büyür: kısa olan "sadece kod", uzun olan "problem çözen"; kupa uzun sütuna düşer. */

const BASE = 1450;
const W = 200;

const Column: React.FC<{x: number; h: number; fill: string; children: React.ReactNode; label: string[]; labelColor: string}> = ({x, h, fill, children, label, labelColor}) => (
  <g>
    <rect x={x + 8} y={BASE - h + 10} width={W} height={h} rx={22} fill={B.ink} />
    <rect x={x} y={BASE - h} width={W} height={h} rx={22} fill={fill} stroke={B.ink} strokeWidth={6} />
    <g transform={`translate(${x + W / 2} ${BASE - h + 72})`} opacity={h > 150 ? 1 : 0}>
      {children}
    </g>
    {h > 150
      ? label.map((line, i) => (
          <Label key={line} x={x + W / 2} y={BASE - 74 + i * 40} size={32} color={labelColor}>
            {line}
          </Label>
        ))
      : null}
  </g>
);

export const Gelecek: React.FC = () => {
  const t = useSceneTime('gelecek');
  const a = easeBack(prog(t, GEL.iyiKod, 0.6)) * 230;
  const b = easeBack(prog(t, GEL.gercek, 0.8)) * 540;
  const drop = prog(t, GEL.kazanacak - 0.2, 0.45);
  const trophyY = BASE - b - 92 - (1 - easeOut(drop)) * 500;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} opacity={0.1} />
      <Stage>
        <path d={`M60 ${BASE} H600`} stroke={B.ink} strokeWidth={8} strokeLinecap="round" />
        <Column x={80} h={a} fill={B.paper} label={['Sadece', 'kod']} labelColor={B.ink}>
          <circle r={46} fill={B.mint} stroke={B.ink} strokeWidth={6} />
          <CodeIcon s={0.56} />
        </Column>
        <Column x={330} h={b} fill={B.orange} label={['Problem', 'çözen']} labelColor={B.paper}>
          <Bulb s={0.9} glow={prog(t, GEL.cozenler, 0.4)} />
        </Column>
        {drop > 0 ? <Trophy x={430} y={trophyY} s={1.35} /> : null}
        <Sparkle x={560} y={BASE - b - 150} r={26} color={B.paper} spin={t * 60} scale={easeBack(prog(t, GEL.kazanacak + 0.2, 0.4))} />
        <Sparkle x={290} y={BASE - b - 60} r={18} spin={-t * 60} scale={easeBack(prog(t, GEL.kazanacak + 0.35, 0.4))} />
      </Stage>
    </AbsoluteFill>
  );
};
