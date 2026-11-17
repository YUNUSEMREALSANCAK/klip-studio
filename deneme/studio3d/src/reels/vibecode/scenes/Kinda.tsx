import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {B, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {KINDA, useSceneTime} from '../timeline';
import {SITE_GREEN} from './Browser';

/* 25,1–28,3 sn · "Üstelik sadece evet veya hayır demiyor."
   EVET ve HAYIR hapları gelir, "demiyor"da üstleri çizilip kenara kayar; sitenin gerçek "KINDA" rozeti damga gibi iner. */

const Pill: React.FC<{t: number; at: number; text: string; bg: string; fg: string; x: number; side: -1 | 1}> = ({t, at, text, bg, fg, x, side}) => {
  const q = pop(t, at, 0.4);
  const off = easeOut(prog(t, KINDA.demiyor, 0.4));
  const strike = prog(t, KINDA.demiyor - 0.05, 0.25);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 170,
        top: 640,
        width: 340,
        height: 120,
        borderRadius: 24,
        background: bg,
        color: fg,
        border: `6px solid ${B.ink}`,
        boxShadow: `8px 10px 0 ${B.ink}`,
        fontFamily: mono,
        fontWeight: 600,
        fontSize: 58,
        letterSpacing: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(1, q * 1.5) * (1 - off * 0.55),
        transform: `translate(${off * side * 40}px, ${-off * 30}px) scale(${q * (1 - off * 0.25)}) rotate(${off * side * 8}deg)`,
      }}
    >
      {text}
      <div style={{position: 'absolute', left: 20, right: 20, top: 52, height: 10, borderRadius: 5, background: B.orange, transform: `scaleX(${strike})`, transformOrigin: 'left'}} />
    </div>
  );
};

export const Kinda: React.FC = () => {
  const t = useSceneTime('kinda');
  const stamp = prog(t, KINDA.demiyor, 0.22);
  const s = stamp > 0 ? 1.5 - 0.5 * easeOut(stamp) : 0;
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Pill t={t} at={KINDA.evet - 0.05} text="EVET" bg={SITE_GREEN} fg={B.ink} x={300} side={-1} />
      <Pill t={t} at={KINDA.hayir - 0.05} text="HAYIR" bg="#F2484B" fg={B.paper} x={780} side={1} />
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 830,
          width: 760,
          borderRadius: 30,
          border: `6px solid ${B.ink}`,
          boxShadow: `10px 12px 0 ${B.ink}`,
          overflow: 'hidden',
          background: '#0B0D0B',
          padding: 18,
          opacity: stamp > 0 ? 1 : 0,
          transform: `scale(${s}) rotate(${-4 + 2 * easeOut(stamp)}deg)`,
        }}
      >
        <Img src={staticFile('reels/vibecode/site/kinda.png')} style={{width: 712, display: 'block'}} />
      </div>
      <Stage>
        <Sparkle x={150} y={860} r={28} spin={t * 60} scale={pop(t, KINDA.demiyor + 0.15)} />
        <Sparkle x={960} y={1060} r={22} color={B.mint} spin={-t * 60} scale={pop(t, KINDA.demiyor + 0.3)} />
      </Stage>
    </AbsoluteFill>
  );
};
