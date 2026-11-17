import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SEKTOR, useSceneTime} from '../timeline';
import {Cap, Card, Dumbbell, Gavel, Heart, Label} from './icons';

/* 18,3–22,4 sn · "Yazılım dışında bir sektör düşün. Mesela sağlık, hukuk, eğitim veya fitness." */

export const SECTORS = [
  {label: 'Sağlık', Icon: Heart, at: SEKTOR.saglik},
  {label: 'Hukuk', Icon: Gavel, at: SEKTOR.hukuk},
  {label: 'Eğitim', Icon: Cap, at: SEKTOR.egitim},
  {label: 'Fitness', Icon: Dumbbell, at: SEKTOR.fitness},
];
const W = 220;
const X0 = 70 + W / 2;
const GAP = W + 20;

export const Sektor: React.FC = () => {
  const t = useSceneTime('sektor');
  const ghost = pop(t, SEKTOR.sektor, 0.45) * (1 - prog(t, SEKTOR.saglik, 0.3));
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        {/* "bir sektör düşün": dört boş kart, sonra sırayla dolar */}
        {SECTORS.map((s, i) => {
          const q = pop(t, s.at, 0.42);
          const x = X0 + i * GAP;
          const wig = t > SEKTOR.fitness + 0.3 ? Math.sin(t * 7 + i * 1.3) * 2.5 : 0;
          return (
            <g key={s.label}>
              <rect x={x - W / 2} y={560} width={W} height={270} rx={28} fill="none" stroke={B.ink} strokeWidth={4} strokeDasharray="14 12" opacity={ghost * 0.5} />
              {q > 0 ? (
                <Card x={x} y={695} w={W} h={270} s={q} rot={wig} fill={i === 3 ? B.mint : B.white}>
                  <s.Icon y={-30} s={1.05} />
                  <Label y={98} size={36}>
                    {s.label}
                  </Label>
                </Card>
              ) : null}
            </g>
          );
        })}
        <Sparkle x={X0 + 3 * GAP + 90} y={548} r={26} spin={t * 60} scale={pop(t, SEKTOR.fitness + 0.15)} />
        <Sparkle x={X0 - 80} y={880} r={20} color={B.mint} spin={-t * 50} scale={pop(t, SEKTOR.saglik + 0.2)} />
      </Stage>
    </AbsoluteFill>
  );
};
