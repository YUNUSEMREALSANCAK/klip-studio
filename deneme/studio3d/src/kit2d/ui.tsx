import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {B, body, display, easeOut, life, mono, pop, prog} from './brand';
import {ARMS, Fiti, type Arm} from './Fiti';

/* Yeni marka için ortak 2D parçalar: zemin, çip, parıltı, logo, kapanış */

export const DotGrid: React.FC<{bg: string; dot?: string; opacity?: number}> = ({bg, dot = B.ink, opacity = 0.12}) => (
  <AbsoluteFill style={{background: bg}}>
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${dot} 2.6px, transparent 2.8px)`,
        backgroundSize: '48px 48px',
        backgroundPosition: '24px 24px',
        opacity,
      }}
    />
  </AbsoluteFill>
);

/** Tam ekran SVG sahne alanı (1080×1920) */
export const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);

export const Sparkle: React.FC<{x: number; y: number; r: number; color?: string; spin?: number; scale?: number}> = ({x, y, r, color = B.lemon, spin = 0, scale = 1}) => {
  const k = r * 0.28;
  return (
    <g transform={`translate(${x} ${y}) rotate(${spin}) scale(${scale})`}>
      <path
        d={`M0 ${-r} L${k} ${-k} L${r} 0 L${k} ${k} L0 ${r} L${-k} ${k} L${-r} 0 L${-k} ${-k} Z`}
        fill={color}
        stroke={B.ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </g>
  );
};

/** Hap şeklinde etiket */
export const Chip: React.FC<{text: string; bg: string; fg: string; size?: number; border?: string; style?: React.CSSProperties}> = ({
  text,
  bg,
  fg,
  size = 30,
  border,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: bg,
      color: fg,
      fontFamily: mono,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: size * 0.1,
      padding: `${size * 0.42}px ${size * 0.95}px`,
      borderRadius: 999,
      border: border ? `4px solid ${border}` : undefined,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {text}
  </div>
);

export const Wordmark: React.FC<{size: number; rest?: string}> = ({size, rest = B.ink}) => (
  <span style={{fontFamily: display, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.03, lineHeight: 1}}>
    <span style={{color: B.orange}}>fit</span>
    <span style={{color: rest}}>yazılım</span>
  </span>
);

const waveArm = (t: number): Arm => {
  const w = Math.sin(t * Math.PI * 2 * 1.6);
  const [e, h] = ARMS.wave;
  return [e, [h[0] + w * 8, h[1] - Math.abs(w) * 3]];
};

/**
 * Standart kapanış (marka_kimligi/reels/kapanis_takip_et): Fiti zıplayarak girer, el sallar,
 * logo harf harf gelir, "Takip et" düğmesi basılır. Süre ~3,4 sn.
 */
export const FitiOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const bg = easeOut(prog(t, 0, 0.35));
  const circle = pop(t, 0.1, 0.5);
  const jump = prog(t, 0.15, 0.45);
  const fitiY = (1 - easeOut(jump)) * 700 - Math.sin(Math.PI * jump) * 120;
  const land = prog(t, 0.6, 0.25);
  const squash = 1 - Math.sin(Math.PI * land) * 0.1;
  const letters = 'fityazılım'.split('');
  const btn = pop(t, 1.25, 0.4);
  const press = prog(t, 1.9, 0.12) - prog(t, 2.05, 0.15);
  const blink = Math.floor(t * fps) % 75 > 71;
  return (
    <AbsoluteFill style={{opacity: bg}}>
      <DotGrid bg={B.paper} />
      <Stage>
        <circle cx={540} cy={800} r={390 * circle} fill={B.lemon} />
        <Sparkle x={220} y={520} r={32} color={B.mint} scale={pop(t, 0.7)} spin={t * 40} />
        <Sparkle x={880} y={470} r={24} scale={pop(t, 0.8)} spin={-t * 50} />
        <ellipse cx={540} cy={1122} rx={220 * circle} ry={18} fill={B.ink} opacity={0.12} />
        <g transform={`translate(${540 - 120 * 2.6} ${1120 - 322 * 2.6 + fitiY}) scale(2.6)`}>
          <Fiti armL={ARMS.down} armR={t > 0.7 ? waveArm(t) : ARMS.down} face="nese" tilt={4} squash={squash} blink={blink} />
        </g>
      </Stage>
      <AbsoluteFill style={{alignItems: 'center', top: 1200, height: 'auto'}}>
        <div style={{display: 'flex'}}>
          {letters.map((ch, i) => {
            const q = pop(t, 0.55 + i * 0.045, 0.35);
            return (
              <span
                key={i}
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 150,
                  letterSpacing: -4.5,
                  color: i < 3 ? B.orange : B.ink,
                  opacity: Math.min(1, q * 1.4),
                  display: 'inline-block',
                  transform: `translateY(${(1 - q) * 50}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{fontFamily: mono, fontSize: 34, color: B.muted, marginTop: 8, opacity: life(t, 1.0, 99)}}>@fityazilim</div>
        <div
          style={{
            marginTop: 28,
            background: B.ink,
            color: B.paper,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 54,
            padding: '26px 92px',
            borderRadius: 999,
            transform: `scale(${btn * (1 - press * 0.08)})`,
            boxShadow: `0 ${10 - press * 8}px 0 ${B.orange}`,
          }}
        >
          Takip et
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
