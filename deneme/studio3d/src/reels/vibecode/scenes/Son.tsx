import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, mono, pop} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, SON, useSceneTime} from '../timeline';
import {Browser, Mark} from './Browser';

/* 41,4 sn–son · "Can I vibe code it?" — adres çubuğuna canivibecodeit.com yazılır, başlık parlar. */

export const Son: React.FC = () => {
  const t = useSceneTime('son');
  const pill = pop(t, SON.it, 0.45);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Browser
        t={t}
        enter={SCENES.son[0] + 0.2}
        typeUrl={{at: SCENES.son[0] + 0.45, text: 'canivibecodeit.com', speed: 0.045}}
        pages={[{at: 0, src: 'home_hero.png', url: 'canivibecodeit.com'}]}
        views={[
          {t: 0, x: 0, y: 0, w: 800},
          {t: SON.can, x: 60, y: 100, w: 680, dur: 0.6},
        ]}
      >
        <Mark t={t} at={SON.code} x={128} y={138} w={545} h={80} />
      </Browser>
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 1230,
          background: B.lemon,
          border: `6px solid ${B.ink}`,
          boxShadow: `8px 10px 0 ${B.ink}`,
          borderRadius: 999,
          padding: '18px 34px',
          fontFamily: mono,
          fontWeight: 600,
          fontSize: 40,
          color: B.ink,
          opacity: Math.min(1, pill * 1.5),
          transform: `scale(${pill}) rotate(-3deg)`,
          transformOrigin: 'left center',
        }}
      >
        canivibecodeit.com
      </div>
      <Stage>
        <Sparkle x={980} y={560} r={28} spin={t * 60} scale={pop(t, SON.code)} />
        <Sparkle x={620} y={1220} r={20} color={B.orange} spin={-t * 60} scale={pop(t, SON.it + 0.15)} />
      </Stage>
    </AbsoluteFill>
  );
};
