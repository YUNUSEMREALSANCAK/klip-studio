import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeInOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, SITE, useSceneTime} from '../timeline';
import {Browser, Mark} from './Browser';

/* 4,9–9 sn · "Bu sorunun cevabı bir web sitesinde gizli. Can I Vibecode It?"
   Tarayıcı penceresi perdeli gelir; "gizli"de perde kalkar, "Can I"da başlığa yakınlaşır. */

/** Sayfanın üstünü kapatan perde (sayfa koordinatlarında) */
const Curtain: React.FC<{t: number}> = ({t}) => {
  const up = easeInOut(prog(t, SITE.gizli, 0.5));
  if (up >= 1) return null;
  const shake = t < SITE.gizli ? Math.sin(t * 30) * 2 * prog(t, SITE.web, 0.2) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        background: B.ink3,
        transform: `translateY(${-up * 620}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <svg width={120} height={140} viewBox="0 0 22 26" style={{transform: `rotate(${shake}deg)`}}>
        <path d="M5 11 V7 A6 6 0 0 1 17 7 V11" stroke={B.lemon} strokeWidth={3} fill="none" />
        <rect x={1} y={11} width={20} height={14} rx={4} fill={B.lemon} />
        <circle cx={11} cy={17} r={2.2} fill={B.ink} />
      </svg>
      <div style={{fontFamily: mono, fontWeight: 600, fontSize: 30, letterSpacing: 8, color: B.lemon}}>???</div>
    </div>
  );
};

export const Site: React.FC = () => {
  const t = useSceneTime('site');
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} />
      <Browser
        t={t}
        enter={SCENES.site[0] + 0.25}
        pages={[{at: 0, src: 'home_hero.png', url: 'canivibecodeit.com'}]}
        views={[
          {t: 0, x: 0, y: 0, w: 800},
          {t: SITE.can - 0.1, x: 110, y: 120, w: 580, dur: 0.6},
        ]}
      >
        <Mark t={t} at={SITE.it - 0.05} x={128} y={138} w={545} h={80} />
        <Curtain t={t} />
      </Browser>
      <Stage>
        <Sparkle x={960} y={600} r={30} spin={t * 60} color={B.orange} scale={pop(t, SITE.gizli + 0.1)} />
        <Sparkle x={120} y={560} r={22} color={B.mint} spin={-t * 60} scale={pop(t, SITE.gizli + 0.25)} />
      </Stage>
    </AbsoluteFill>
  );
};
