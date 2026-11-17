import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {HOOK, useSceneTime} from '../timeline';
import {AppTile, CodeBubble, PriceTag, QMark, type Glyph} from './icons';

/* 0–5,3 sn · "Yapay zekâ ile artık her şeyi kodlayabiliyorsan, hangi uygulamalara para ödemeye devam edeceğiz?"
   Beş uygulama simgesi süzülür; "kodlayabiliyorsan"da kod baloncuğu tarar, "para"da fiyat etiketleri asılır,
   "edeceğiz"de büyük soru işareti. */

const TILES: {x: number; y: number; glyph: Glyph; fill: string; price: string}[] = [
  {x: 230, y: 680, glyph: 'play', fill: B.orange, price: '$/ay'},
  {x: 540, y: 640, glyph: 'pen', fill: B.sky, price: '$/ay'},
  {x: 850, y: 680, glyph: 'note', fill: B.mint, price: '$/ay'},
  {x: 160, y: 900, glyph: 'chat', fill: B.lemon, price: '$/ay'},
  {x: 920, y: 900, glyph: 'photo', fill: B.orangeLight, price: '$/ay'},
];

export const Hook: React.FC = () => {
  const t = useSceneTime('hook');
  const scan = prog(t, HOOK.kodlayabiliyorsan, 0.9);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <circle cx={540} cy={1260} r={360 * pop(t, 0.1, 0.5)} fill={B.lemon} />
        {TILES.map((tile, i) => {
          const bob = Math.sin(t * 2.2 + i * 1.3) * 10;
          const lit = Math.max(0, 1 - Math.abs(scan * 1.3 - tile.x / 1080) * 4);
          return (
            <g key={i}>
              <AppTile x={tile.x} y={tile.y + bob} s={pop(t, 0.15 + i * 0.12) * (1 + lit * 0.12)} rot={(i % 2 ? 1 : -1) * 6} glyph={tile.glyph} fill={tile.fill} />
              <PriceTag x={tile.x + 30} y={tile.y + bob + 86} s={pop(t, HOOK.para + i * 0.09, 0.35) * 0.85} rot={(i % 2 ? -1 : 1) * 8} text={tile.price} />
            </g>
          );
        })}
        <CodeBubble x={120 + scan * 840} y={560} s={pop(t, HOOK.kodlayabiliyorsan - 0.1) * (1 - prog(t, HOOK.hangi, 0.3)) * 0.8} />
        <QMark x={810} y={1080} s={pop(t, HOOK.edecegiz, 0.45) * 1.2} rot={10} />
        <Sparkle x={250} y={1110} r={28} spin={t * 50} scale={pop(t, HOOK.edecegiz + 0.1)} />
        <Sparkle x={960} y={1260} r={20} color={B.mint} spin={-t * 60} scale={pop(t, HOOK.edecegiz + 0.25)} />
      </Stage>
    </AbsoluteFill>
  );
};
