import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, fontFamily} from './theme';

/* Fityazılım kapanışı: 3D evren kararır, logo harf harf yanar, "Takip et" */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dim = interpolate(t, [0, 0.6], [0, 0.62], clamp);
  const letters = 'fityazılım'.split('');
  const follow = easeOut(interpolate(t, [1.1, 1.5], [0, 1], clamp));
  return (
    <AbsoluteFill style={{background: `rgba(1, 4, 12, ${dim})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', marginTop: -120}}>
        {letters.map((ch, i) => {
          const p = easeOut(interpolate(t, [0.2 + i * 0.05, 0.6 + i * 0.05], [0, 1], clamp));
          const isFit = i < 3;
          return (
            <span
              key={i}
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 150,
                letterSpacing: -4,
                color: isFit ? C.white : C.cyan,
                opacity: p,
                translate: `0 ${(1 - p) * 40}px`,
                textShadow: `0 0 ${30 + (1 - p) * 60}px ${isFit ? 'rgba(255,255,255,0.45)' : C.cyan}`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 60,
          fontFamily,
          fontWeight: 800,
          fontSize: 52,
          color: C.bg,
          background: C.cyan,
          padding: '20px 56px',
          borderRadius: 999,
          opacity: follow,
          scale: `${0.85 + follow * 0.15}`,
          boxShadow: `0 0 50px ${C.cyan}88`,
        }}
      >
        Takip et
      </div>
    </AbsoluteFill>
  );
};
