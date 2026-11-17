import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, mono} from '../../kit2d/brand';
import {ARMS, Fiti} from '../../kit2d/Fiti';
import {DotGrid, Sparkle, Stage} from '../../kit2d/ui';
import {Coin, TokenChip} from './scenes/icons';

/* Kapak: tokenler paraya dönüşür, Fiti kollarını kaldırmış */
export const Cover: React.FC = () => (
  <AbsoluteFill>
    <DotGrid bg={B.paper} />
    <Stage>
      <circle cx={540} cy={1240} r={360} fill={B.lemon} />
      <TokenChip x={170} y={1010} s={1.3} rot={-14} />
      <TokenChip x={240} y={1150} s={1.1} rot={10} />
      <Coin x={900} y={1040} s={1.3} rot={12} />
      <Coin x={850} y={1180} s={1.05} rot={-8} />
      <Sparkle x={220} y={1400} r={30} color={B.mint} />
      <Sparkle x={880} y={880} r={26} />
      <ellipse cx={540} cy={1562} rx={250} ry={20} fill={B.ink} opacity={0.12} />
      <g transform={`translate(${540 - 120 * 2.6} ${1560 - 322 * 2.6}) scale(2.6)`}>
        <Fiti armL={ARMS.up} armR={ARMS.up} face="nese" tilt={-3} />
      </g>
    </Stage>
    <div style={{position: 'absolute', left: 80, top: 230}}>
      <div style={{display: 'inline-block', background: B.ink, color: B.mint, fontFamily: mono, fontWeight: 600, fontSize: 30, letterSpacing: 3, padding: '13px 30px', borderRadius: 999}}>
        YAZILIMCILIĞIN GELECEĞİ
      </div>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 116, lineHeight: 1, letterSpacing: -3.5, color: B.ink, marginTop: 40}}>
        Tokenleri
        <br />
        <span style={{color: B.orange, background: B.lemon, borderRadius: 16, padding: '0 18px', marginLeft: -18}}>paraya</span>
        <br />
        çevirebilmek
      </div>
    </div>
  </AbsoluteFill>
);
