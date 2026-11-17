import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, pop} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {INTRO, useSceneTime} from '../timeline';
import {MiniKey} from '../../../kit2d/shapes';

/* 0–4,8 sn · "Yapay zekâ dünyasında bu hafta neler oldu? Son haber Türkiye'den!" */
export const Intro: React.FC = () => {
  const t = useSceneTime('intro');
  const bob = (k: number) => Math.sin(t * 2.4 + k) * 10;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <circle cx={540} cy={1250} r={340 * pop(t, 0.1, 0.5)} fill={B.lemon} />
        <MiniKey x={150} y={1010 + bob(0)} label="A" rot={-12} scale={pop(t, 0.35)} />
        <MiniKey x={935} y={1080 + bob(1.5)} label="I" rot={10} scale={pop(t, 0.45)} />
        <MiniKey x={900} y={790 + bob(3)} w={90} label="?" rot={-6} scale={pop(t, INTRO.neler)} />
        <Sparkle x={210} y={800} r={34} color={B.mint} spin={t * 50} scale={pop(t, 0.6)} />
        <Sparkle x={300} y={1420} r={22} spin={-t * 60} scale={pop(t, 0.8)} />
        <Sparkle x={830} y={1380} r={28} spin={t * 40} scale={pop(t, INTRO.son)} />
      </Stage>
    </AbsoluteFill>
  );
};
