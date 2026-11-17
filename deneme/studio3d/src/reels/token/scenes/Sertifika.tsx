import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {MiniKey} from '../../../kit2d/shapes';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, SERT, useSceneTime} from '../timeline';
import {Card, Label} from './icons';

/* 34,8–40 sn · "Bu yüzden bence 90 günde Python öğrenip sertifika almaya çalışmak yerine,
   kendinize şu soruyu sormalısınız:"
   Sertifika dolar (90 gün sayacı, Python, mühür); "yerine"de kenara kayar, yerine soru tuşu gelir. */

export const Sertifika: React.FC = () => {
  const t = useSceneTime('sertifika');
  const q = pop(t, SCENES.sertifika[0] + 0.15, 0.5);
  const days = Math.round(90 * easeOut(prog(t, SERT.doksan, 0.7)));
  const python = pop(t, SERT.python, 0.4);
  const stamp = prog(t, SERT.sertifika, 0.22);
  const stampScale = stamp > 0 ? 1.6 - 0.6 * easeOut(stamp) : 0;
  const aside = easeOut(prog(t, SERT.yerine, 0.5));
  const ask = pop(t, SERT.kendinize, 0.45);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <g transform={`translate(${540 - aside * 140} ${735 - aside * 40}) rotate(${-aside * 7}) scale(${q * (1 - aside * 0.3)})`} opacity={1 - aside * 0.5}>
          <Card x={0} y={0} w={800} h={340} fill={B.white}>
            <rect x={-380} y={-150} width={760} height={300} rx={20} fill="none" stroke={B.lemon} strokeWidth={8} />
            <text x={-330} y={-82} fontFamily={mono} fontWeight={600} fontSize={26} letterSpacing={6} fill={B.muted}>
              SERTİFİKA
            </text>
            <g transform={`translate(-330 18) scale(${python})`}>
              <text fontFamily={display} fontWeight={800} fontSize={104} letterSpacing={-3} fill={B.ink}>
                Python
              </text>
            </g>
            <path d="M-330 80 H-60" stroke={B.ink} strokeWidth={4} strokeLinecap="round" />
            <Label x={-330} y={118} size={24} weight={600} color={B.muted} anchor="start">
              imza
            </Label>
            {/* 90 gün sayacı */}
            <g transform={`translate(240 -80) scale(${pop(t, SERT.doksan - 0.15)})`}>
              <rect x={-90} y={-46} width={180} height={92} rx={20} fill={B.ink} />
              <text y={14} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={52} fill={B.mint}>
                {days} gün
              </text>
            </g>
            {/* Mühür */}
            <g transform={`translate(250 60) rotate(-12) scale(${stampScale})`} opacity={stamp > 0 ? 1 : 0}>
              <path d="M-26 20 L-40 92 L-12 76 L0 100 L12 20 Z M26 20 L40 92 L12 76 L0 100" fill={B.orangeDark} stroke={B.ink} strokeWidth={5} strokeLinejoin="round" />
              <circle r={62} fill={B.orange} stroke={B.ink} strokeWidth={6} />
              <circle r={44} fill="none" stroke={B.paper} strokeWidth={4} strokeDasharray="8 7" />
              <path d="M-18 0 L-4 14 L20 -14" stroke={B.paper} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </Card>
        </g>
        <MiniKey x={820} y={1150} w={210} label="?" rot={8} scale={ask} />
        <Sparkle x={950} y={1010} r={26} spin={t * 60} scale={pop(t, SERT.soruyu)} />
        <Sparkle x={690} y={1300} r={18} color={B.mint} spin={-t * 60} scale={pop(t, SERT.soruyu + 0.15)} />
      </Stage>
    </AbsoluteFill>
  );
};
