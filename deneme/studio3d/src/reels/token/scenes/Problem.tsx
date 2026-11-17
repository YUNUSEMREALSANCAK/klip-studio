import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Stage} from '../../../kit2d/ui';
import {PROB, useSceneTime} from '../timeline';
import {Card, CodeIcon, Coin, Label, Person} from './icons';

/* 29,8–34,8 sn · "Çünkü artık mesele sadece yazılım geliştirmek değil,
   insanların para ödemeye hazır olduğu bir problemi çözmek."
   Önce "Yazılım geliştirmek" kartı çizilip küçülür; yerine fiyat etiketli PROBLEM kartı ve
   ellerinde parayla bekleyen insanlar gelir. */

const DevCard: React.FC<{t: number}> = ({t}) => {
  const q = pop(t, PROB.yazilim - 0.3, 0.45);
  const strike = easeOut(prog(t, PROB.degil, 0.3));
  const away = easeOut(prog(t, PROB.insanlarin - 0.1, 0.4));
  return (
    <g transform={`translate(${540 - away * 200} ${700 + away * 40}) scale(${q * (1 - away * 0.4)})`} opacity={1 - away}>
      <Card x={0} y={0} w={640} h={200}>
        <g transform="translate(-230 0)">
          <circle r={58} fill={B.mint} stroke={B.ink} strokeWidth={6} />
          <CodeIcon s={0.8} />
        </g>
        <Label x={-140} y={14} size={46} anchor="start">
          Yazılım geliştirmek
        </Label>
      </Card>
      <path d={`M-300 6 L${-300 + 600 * strike} -6`} stroke={B.orange} strokeWidth={14} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
    </g>
  );
};

const ProblemCard: React.FC<{t: number}> = ({t}) => {
  const q = pop(t, PROB.insanlarin + 0.15, 0.45);
  const tagIn = pop(t, PROB.odemeye, 0.45);
  const swing = Math.sin(Math.max(0, t - PROB.odemeye) * 5) * 8 * Math.exp(-Math.max(0, t - PROB.odemeye) * 0.8);
  return (
    <g transform={`translate(600 760) scale(${q})`}>
      <Card x={0} y={0} w={560} h={250} fill={B.orange}>
        <path d="M-200 -50 L-150 -136 L-100 -50 Z" transform="translate(0 70)" fill={B.lemon} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
        <text x={-150} y={10} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={58} fill={B.ink}>
          !
        </text>
        <text x={-80} y={0} fontFamily={display} fontWeight={800} fontSize={64} letterSpacing={-1} fill={B.paper}>
          PROBLEM
        </text>
        <text x={-80} y={50} fontFamily={mono} fontWeight={600} fontSize={22} letterSpacing={2} fill={B.ink}>
          ÇÖZÜM BEKLİYOR
        </text>
      </Card>
      {/* Fiyat etiketi */}
      <g transform={`translate(230 -120) rotate(${swing + 12}) scale(${tagIn})`}>
        <path d="M0 -40 V0" stroke={B.ink} strokeWidth={4} />
        <path d="M-80 0 H60 L100 40 L60 80 H-80 Q-92 80 -92 68 V12 Q-92 0 -80 0 Z" fill={B.lemon} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
        <circle cx={66} cy={40} r={8} fill={B.paper} stroke={B.ink} strokeWidth={4} />
        <text x={-14} y={36} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={20} fill={B.ink}>
          ÖDEMEYE
        </text>
        <text x={-14} y={62} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={20} fill={B.ink}>
          HAZIR
        </text>
      </g>
    </g>
  );
};

/** Ellerinde parayla bekleyen insanlar (Fiti sağda, onlar solda) */
const Crowd: React.FC<{t: number}> = ({t}) => {
  const people = [
    {x: 150, y: 1330, c: B.mint},
    {x: 300, y: 1360, c: B.lemon},
    {x: 450, y: 1330, c: B.ink3},
  ];
  return (
    <g>
      {people.map((p, i) => {
        const q = pop(t, PROB.insanlarin + i * 0.12, 0.4);
        const coin = pop(t, PROB.para + i * 0.12, 0.4);
        const bounce = Math.abs(Math.sin(Math.max(0, t - PROB.para) * 5 + i)) * 14 * coin;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${q})`}>
            <Person s={1.25} color={p.c} />
            <Coin y={-110 - bounce} s={0.7 * coin} />
          </g>
        );
      })}
    </g>
  );
};

export const Problem: React.FC = () => {
  const t = useSceneTime('problem');
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <DevCard t={t} />
        <ProblemCard t={t} />
        <Crowd t={t} />
      </Stage>
    </AbsoluteFill>
  );
};
