import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, body, easeInOut, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, TERAZI, useSceneTime} from '../timeline';
import {BigScale, CodeBubble, INK, PriceTag} from './icons';

/* 19,5–25,5 sn · "Bunu yapay zekâ kullanarak kendim geliştirebilir miyim, yoksa bu uygulamaya para ödemeye devam mı etmeliyim?"
   Terazi: "geliştirebilir"de kendim yap kefesine, "ödemeye"de para öde kefesine iner; "etmeliyim"de dengede sallanır. */

const Coins: React.FC = () => (
  <g>
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${-34 + i * 34} ${-i * 6})`}>
        <ellipse cy={8} rx={34} ry={34} fill={B.orangeDark} {...INK} />
        <circle r={34} fill={B.lemon} {...INK} />
        <path d="M-5 -10 V10 M5 -10 V10" stroke={B.orangeDark} strokeWidth={5} strokeLinecap="round" />
      </g>
    ))}
  </g>
);

const Label: React.FC<{x: number; y: number; text: string; on: number}> = ({x, y, text, on}) => (
  <g transform={`translate(${x} ${y}) scale(${0.9 + 0.1 * on})`} opacity={0.45 + 0.55 * on}>
    <rect x={-150} y={-34} width={300} height={68} rx={34} fill={on > 0.5 ? B.orange : B.ink3} stroke={B.paper} strokeWidth={4} />
    <text y={12} textAnchor="middle" fontFamily={body} fontWeight={800} fontSize={32} fill={B.paper}>
      {text}
    </text>
  </g>
);

export const Terazi: React.FC = () => {
  const t = useSceneTime('terazi');
  const toSelf = easeInOut(prog(t, TERAZI.gelistirebilir - 0.1, 0.5));
  const toPay = easeInOut(prog(t, TERAZI.odemeye - 0.1, 0.5));
  const settle = prog(t, TERAZI.etmeliyim, 0.25);
  const wobble = t > TERAZI.etmeliyim ? Math.sin((t - TERAZI.etmeliyim) * 9) * 7 * Math.exp(-(t - TERAZI.etmeliyim) * 1.6) : 0;
  const tip = (-13 * toSelf + 26 * toPay - 13 * settle) * 1 + wobble;
  const q = pop(t, SCENES.terazi[0] + 0.25, 0.5);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.ink} dot={B.paper} opacity={0.08} />
      <Stage>
        <g transform={`translate(540 700) scale(${q}) translate(-540 -700)`}>
          <BigScale
            x={540}
            y={700}
            tip={tip}
            left={<CodeBubble s={0.75} y={-6} />}
            right={
              <g>
                <Coins />
                <PriceTag y={-70} s={0.8} rot={-8} text="$/ay" />
              </g>
            }
          />
        </g>
        <Label x={200} y={1120} text="Kendim yaparım" on={toSelf * (1 - toPay)} />
        <Label x={880} y={1120} text="Para öderim" on={toPay * (1 - settle * 0.5)} />
        <Sparkle x={160} y={620} r={24} color={B.mint} spin={t * 60} scale={pop(t, TERAZI.gelistirebilir)} />
        <Sparkle x={930} y={600} r={26} spin={-t * 60} scale={pop(t, TERAZI.odemeye)} />
      </Stage>
    </AbsoluteFill>
  );
};
