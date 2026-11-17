import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {B, easeInOut, mono, pop, prog} from '../../../kit2d/brand';
import {Cursor} from '../../../kit2d/shapes';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {SCENES, SECIM, useSceneTime} from '../timeline';
import {Browser, Mark, SITE_BOX, SITE_GREEN} from './Browser';

/* 16,2–19,9 sn · "Uygulamayı seçiyorsun ve sana şu sorunun cevabını veriyor:"
   Arama kutusuna "capcut" yazılır, sonuç tıklanır, CapCut sayfası açılır ve başlığa yakınlaşır. */

const OPEN = SECIM.seciyorsun + 0.2;
const QUERY = 'capcut';
const typeAt = SECIM.uygulamayi - 0.5;

/** Ana sayfadaki arama kutusu ve açılır sonuç (sayfa koordinatlarında) */
const Search: React.FC<{t: number}> = ({t}) => {
  if (t >= OPEN + 0.2) return null;
  const n = Math.min(QUERY.length, Math.floor(Math.max(0, t - typeAt) / 0.08));
  const drop = pop(t, typeAt + QUERY.length * 0.08, 0.3);
  const pressed = t > SECIM.seciyorsun - 0.05;
  return (
    <>
      <div style={{position: 'absolute', left: 96, top: 312, width: 600, height: 40, background: SITE_BOX, display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 17, color: '#EDEDE6'}}>
        <span style={{color: SITE_GREEN}}>&gt;</span>
        <span>{QUERY.slice(0, n)}</span>
        <span style={{width: 9, height: 20, background: SITE_GREEN, opacity: Math.floor(t * 3) % 2 ? 1 : 0.3}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 81,
          top: 366,
          width: 638,
          height: 56,
          borderRadius: 8,
          background: pressed ? '#1D261D' : SITE_BOX,
          border: `1px solid ${pressed ? SITE_GREEN : '#2A312A'}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          opacity: drop,
          transform: `translateY(${(1 - drop) * -10}px)`,
        }}
      >
        <Img src={staticFile('reels/vibecode/site/capcut_title.png')} style={{height: 38}} />
      </div>
    </>
  );
};

export const Secim: React.FC = () => {
  const t = useSceneTime('secim');
  const move = easeInOut(prog(t, SECIM.uygulamayi, 0.45));
  const press = prog(t, SECIM.seciyorsun - 0.05, 0.08) - prog(t, SECIM.seciyorsun + 0.05, 0.12);
  const cursorOut = prog(t, OPEN + 0.2, 0.3);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Browser
        t={t}
        enter={SCENES.secim[0] + 0.2}
        pages={[
          {at: 0, src: 'home_hero.png', url: 'canivibecodeit.com'},
          {at: OPEN, src: 'capcut_page.png', url: 'canivibecodeit.com/capcut'},
        ]}
        views={[
          {t: 0, x: 40, y: 230, w: 720},
          {t: OPEN, x: 0, y: 40, w: 800, dur: 0.05},
          {t: SECIM.cevabini - 0.2, x: 0, y: 110, w: 560, dur: 0.6},
        ]}
      >
        <Search t={t} />
        <Mark t={t} at={SECIM.veriyor - 0.1} x={14} y={124} w={530} h={74} />
      </Browser>
      <Stage>
        <g opacity={1 - cursorOut}>
          <Cursor x={880 - move * 300} y={1120 - move * 290} s={1.6 * (1 - press * 0.15)} />
        </g>
        <Sparkle x={980} y={1240} r={24} spin={t * 60} scale={pop(t, SECIM.veriyor)} />
      </Stage>
    </AbsoluteFill>
  );
};
