import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {LISTE, SCENES, useSceneTime} from '../timeline';
import {Browser} from './Browser';

/* 8,6–13 sn · "Siteye giriyorsun ve karşına binden fazla popüler uygulama çıkıyor."
   Sitenin uygulama listesi aşağı kayar; "binden fazla"da sayaç rozeti 1.000+'a sayar. */

const Counter: React.FC<{t: number}> = ({t}) => {
  const q = pop(t, LISTE.binden - 0.1, 0.45);
  const n = Math.round(1000 * easeOut(prog(t, LISTE.binden, 0.75)));
  const plus = pop(t, LISTE.fazla, 0.3);
  return (
    <g transform={`translate(850 1250) rotate(8) scale(${q})`}>
      <circle r={132} fill={B.orange} stroke={B.ink} strokeWidth={7} />
      <circle r={112} fill="none" stroke={B.paper} strokeWidth={4} strokeDasharray="10 9" />
      <text y={14} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={62} letterSpacing={-2} fill={B.paper}>
        {n.toLocaleString('tr-TR')}
        <tspan fill={B.lemon} opacity={plus}>
          +
        </tspan>
      </text>
      <text y={62} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={24} letterSpacing={4} fill={B.ink}>
        UYGULAMA
      </text>
    </g>
  );
};

export const Liste: React.FC = () => {
  const t = useSceneTime('liste');
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Browser
        t={t}
        enter={SCENES.liste[0] + 0.2}
        pages={[{at: 0, src: 'home_list.png', url: 'canivibecodeit.com/#death-list'}]}
        views={[
          {t: 0, x: 0, y: 0, w: 800},
          {t: LISTE.karsina, x: 0, y: 160, w: 800, dur: 1.0},
          {t: LISTE.populer, x: 0, y: 330, w: 800, dur: 1.2},
        ]}
      />
      <Stage>
        <Counter t={t} />
        <Sparkle x={660} y={1330} r={24} spin={t * 60} scale={pop(t, LISTE.fazla + 0.1)} />
        <Sparkle x={1010} y={1080} r={18} color={B.mint} spin={-t * 60} scale={pop(t, LISTE.fazla + 0.25)} />
      </Stage>
    </AbsoluteFill>
  );
};
