import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, easeInOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {AVT, useSceneTime} from '../timeline';

/* 22,4–29,8 sn · "Eğer o sektör hakkında gerçekten bilgi sahibisen ve yapay zekâyı kullanarak
   o sektördeki bir problemi çözebiliyorsan, işte o zaman ciddi bir avantajın var."
   İki daire (sektör bilgisi, yapay zekâ) yaklaşır; kesişimleri "avantaj" olur. */

const CY = 730;
const R = 205;

export const Avantaj: React.FC = () => {
  const t = useSceneTime('avantaj');
  const join = easeInOut(prog(t, AVT.problemi, 0.8));
  const lx = 290 + join * 140;
  const rx = 790 - join * 140;
  const ql = pop(t, AVT.bilgi, 0.45);
  const qr = pop(t, AVT.yapay, 0.45);
  const star = pop(t, AVT.avantajin, 0.45);
  const pulse = 1 + Math.sin(Math.max(0, t - AVT.avantajin) * 6) * 0.03 * star;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} opacity={0.1} />
      <Stage>
        <defs>
          <clipPath id="venn-left">
            <circle cx={lx} cy={CY} r={R} />
          </clipPath>
        </defs>
        <g transform={`translate(${lx} ${CY}) scale(${ql})`}>
          <circle r={R} fill={B.mint} stroke={B.ink} strokeWidth={7} />
        </g>
        <g transform={`translate(${rx} ${CY}) scale(${qr})`}>
          <circle r={R} fill={B.orange} stroke={B.ink} strokeWidth={7} />
        </g>
        {/* Kesişim */}
        <g clipPath="url(#venn-left)" opacity={join}>
          <circle cx={rx} cy={CY} r={R} fill={star > 0 ? B.paper : B.lemon} stroke={B.ink} strokeWidth={7} />
        </g>
        <circle cx={lx} cy={CY} r={R} fill="none" stroke={B.ink} strokeWidth={7} opacity={ql > 0.95 ? 1 : 0} />
        <g opacity={ql}>
          <text x={lx - 60 * join - 20} y={CY - 6} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={50} fill={B.ink}>
            Sektör
          </text>
          <text x={lx - 60 * join - 20} y={CY + 50} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={50} fill={B.ink}>
            bilgisi
          </text>
        </g>
        <g opacity={qr}>
          <text x={rx + 60 * join + 20} y={CY - 6} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={50} fill={B.paper}>
            Yapay
          </text>
          <text x={rx + 60 * join + 20} y={CY + 50} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={50} fill={B.paper}>
            zekâ
          </text>
        </g>
        <g transform={`translate(540 ${CY}) scale(${star * pulse})`}>
          <path d="M0 -62 L16 -18 L62 -18 L25 10 L39 56 L0 28 L-39 56 L-25 10 L-62 -18 L-16 -18 Z" fill={B.lemon} stroke={B.ink} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-86} y={70} width={172} height={44} rx={22} fill={B.ink} />
          <text y={101} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={24} letterSpacing={2.5} fill={B.mint}>
            AVANTAJ
          </text>
        </g>
        <Sparkle x={540 + 150} y={CY - 210} r={28} color={B.paper} spin={t * 60} scale={pop(t, AVT.avantajin + 0.15)} />
        <Sparkle x={540 - 160} y={CY + 230} r={20} spin={-t * 60} scale={pop(t, AVT.avantajin + 0.3)} />
      </Stage>
    </AbsoluteFill>
  );
};
