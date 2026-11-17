import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {B, display, pop} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {ORNEK, useSceneTime} from '../timeline';
import {SITE_BG, SITE_GREEN} from './Browser';

/* 12,6–16,6 sn · "Mesela CapCut, Canva veya kullandığın başka bir yazılım."
   Sitenin başlık satırları kart kart gelir; üçüncü kart boş: "Can I vibecode ___?" */

const Card: React.FC<{t: number; at: number; top: number; from: -1 | 1; children: React.ReactNode}> = ({t, at, top, from, children}) => {
  const q = pop(t, at, 0.45);
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        top,
        width: 860,
        height: 128,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxSizing: 'border-box',
        background: SITE_BG,
        border: `6px solid ${B.ink}`,
        borderRadius: 26,
        boxShadow: `10px 12px 0 ${B.ink}`,
        opacity: Math.min(1, q * 1.6),
        transform: `translateX(${(1 - q) * from * 500}px) rotate(${(1 - q) * from * 6}deg)`,
      }}
    >
      {children}
    </div>
  );
};

export const Ornek: React.FC = () => {
  const t = useSceneTime('ornek');
  const blink = Math.floor(t * 2.5) % 2 === 0;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} />
      <Card t={t} at={ORNEK.capcut - 0.1} top={590} from={-1}>
        <Img src={staticFile('reels/vibecode/site/capcut_title.png')} style={{width: 760}} />
      </Card>
      <Card t={t} at={ORNEK.canva - 0.1} top={760} from={1}>
        <Img src={staticFile('reels/vibecode/site/canva_title.png')} style={{width: 760}} />
      </Card>
      <Card t={t} at={ORNEK.kullandigin} top={930} from={-1}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26, fontFamily: display, fontWeight: 800, fontSize: 50, color: '#EDEDE6', letterSpacing: -1}}>
          <span style={{width: 92, height: 92, borderRadius: 22, border: `4px dashed ${SITE_GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SITE_GREEN, fontSize: 56}}>?</span>
          <span>
            Can I vibecode <span style={{color: SITE_GREEN, opacity: blink ? 1 : 0.35}}>___</span>?
          </span>
        </div>
      </Card>
      <Stage>
        <Sparkle x={980} y={590} r={26} spin={t * 60} scale={pop(t, ORNEK.capcut + 0.1)} />
        <Sparkle x={70} y={880} r={20} color={B.orange} spin={-t * 60} scale={pop(t, ORNEK.canva + 0.1)} />
      </Stage>
    </AbsoluteFill>
  );
};
