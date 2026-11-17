import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, mono} from '../../kit2d/brand';
import {ARMS, Fiti} from '../../kit2d/Fiti';
import {DotGrid, Sparkle, Stage} from '../../kit2d/ui';
import {MiniKey} from '../../kit2d/shapes';

/* Kapak: şaşkın Fiti, büyük başlık, 5 haber */
export const Cover: React.FC = () => (
  <AbsoluteFill>
    <DotGrid bg={B.paper} />
    <Stage>
      <circle cx={540} cy={1240} r={360} fill={B.lemon} />
      <MiniKey x={160} y={1020} label="A" rot={-12} />
      <MiniKey x={925} y={1090} label="I" rot={10} />
      <Sparkle x={220} y={1400} r={30} color={B.mint} />
      <Sparkle x={860} y={860} r={26} />
      <ellipse cx={540} cy={1562} rx={250} ry={20} fill={B.ink} opacity={0.12} />
      <g transform={`translate(${540 - 120 * 2.6} ${1560 - 322 * 2.6}) scale(2.6)`}>
        <Fiti armL={ARMS.point_up} armR={ARMS.down} face="saskin" tilt={-4} pointL />
      </g>
    </Stage>
    <div style={{position: 'absolute', left: 80, top: 230}}>
      <div style={{display: 'inline-block', background: B.ink, color: B.mint, fontFamily: mono, fontWeight: 600, fontSize: 30, letterSpacing: 3, padding: '13px 30px', borderRadius: 999}}>
        26 EKİM – 2 KASIM
      </div>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 120, lineHeight: 1, letterSpacing: -3.6, color: B.ink, marginTop: 40}}>
        Yapay zekâ
        <br />
        bu hafta
        <br />
        <span style={{color: B.orange, background: B.lemon, borderRadius: 16, padding: '0 18px', marginLeft: -18}}>5 haber</span>
      </div>
    </div>
  </AbsoluteFill>
);
