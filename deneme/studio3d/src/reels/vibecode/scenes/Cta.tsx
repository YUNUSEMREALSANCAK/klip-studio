import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeInOut, easeOut, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {CTA, useSceneTime} from '../timeline';
import {Bookmark, Friend, Plane, Receipt} from './icons';

/* 35,8–41,8 sn · "Daha sonra incelemek için kaydet. Aboneliklere boşuna para harcamaması için bir arkadaşına da gönder."
   "kaydet"te yer imi dolar; abonelik faturaları düşer, "boşuna"da üstü çizilir;
   "arkadaşına"da kâğıt uçak arkadaşa uçar. Fiyatlar sitedeki CapCut ve Canva sayfalarından. */

const BILLS = [
  {name: 'CapCut', price: '$19.99/ay', x: 810, y: 660, rot: 6},
  {name: 'Canva', price: '$15/ay', x: 770, y: 930, rot: -5},
];

export const Cta: React.FC = () => {
  const t = useSceneTime('cta');
  const save = easeOut(prog(t, CTA.kaydet - 0.05, 0.35));
  const bm = pop(t, CTA.incelemek - 0.1, 0.45);
  const bump = 1 + Math.sin(Math.PI * prog(t, CTA.kaydet, 0.3)) * 0.15;
  const billsOut = prog(t, CTA.arkadasina - 0.2, 0.3);
  const fly = easeInOut(prog(t, CTA.arkadasina, CTA.gonder - CTA.arkadasina + 0.05));
  const arrived = t >= CTA.gonder + 0.05;
  const friend = pop(t, CTA.arkadasina - 0.15, 0.45);
  const px = 300 + fly * 470;
  const py = 900 - Math.sin(Math.PI * fly) * 260 - fly * 140;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.ink} dot={B.paper} opacity={0.08} />
      <Stage>
        <circle cx={300} cy={740} r={170 * bm} fill={B.ink2} />
        <Bookmark x={300} y={740} s={bm * bump * 1.1} fill={save} rot={-6} />
        {BILLS.map((b, i) => {
          const q = pop(t, CTA.aboneliklere + i * 0.15, 0.4);
          const drop = (1 - easeOut(prog(t, CTA.aboneliklere + i * 0.15, 0.4))) * -200;
          const cross = prog(t, CTA.bosuna + i * 0.12, 0.25);
          if (q <= 0 || billsOut >= 1) return null;
          return (
            <g key={b.name} opacity={1 - billsOut}>
              <Receipt x={b.x} y={b.y + drop} s={q * 1.3} rot={b.rot} name={b.name} price={b.price} />
              <g transform={`translate(${b.x} ${b.y + drop}) rotate(${b.rot}) scale(1.3)`} opacity={cross > 0 ? 1 : 0}>
                <path d={`M-110 -60 L${-110 + 220 * cross} ${-60 + 120 * cross}`} stroke={B.orange} strokeWidth={14} strokeLinecap="round" />
              </g>
            </g>
          );
        })}
        <Friend x={800} y={760} s={friend * (arrived ? 1 + Math.sin(Math.PI * prog(t, CTA.gonder + 0.05, 0.3)) * 0.12 : 1)} fill={B.sky} />
        {fly > 0 && !arrived ? <Plane x={px} y={py} s={0.9} rot={-10 + fly * 20} /> : null}
        <Sparkle x={930} y={620} r={26} spin={t * 60} scale={pop(t, CTA.gonder + 0.1)} />
        <Sparkle x={680} y={900} r={18} color={B.mint} spin={-t * 60} scale={pop(t, CTA.gonder + 0.2)} />
        <Sparkle x={160} y={600} r={22} color={B.lemon} spin={t * 50} scale={pop(t, CTA.kaydet + 0.1)} />
      </Stage>
    </AbsoluteFill>
  );
};
