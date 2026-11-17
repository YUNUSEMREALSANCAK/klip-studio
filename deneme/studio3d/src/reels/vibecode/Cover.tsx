import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, display, mono} from '../../kit2d/brand';
import {ARMS, Fiti} from '../../kit2d/Fiti';
import {DotGrid, Sparkle, Stage} from '../../kit2d/ui';
import {AppTile, CodeBubble, PriceTag} from './scenes/icons';

/* Kapak: uygulamalar ve fiyat etiketleri arasında düşünen Fiti */
export const Cover: React.FC = () => (
  <AbsoluteFill>
    <DotGrid bg={B.paper} />
    <Stage>
      <circle cx={540} cy={1240} r={360} fill={B.lemon} />
      <AppTile x={170} y={1000} rot={-10} glyph="play" fill={B.orange} />
      <PriceTag x={200} y={1090} s={0.85} rot={8} text="$/ay" />
      <AppTile x={910} y={980} rot={8} glyph="pen" fill={B.sky} />
      <PriceTag x={930} y={1070} s={0.85} rot={-8} text="$/ay" />
      <CodeBubble x={880} y={1300} s={0.8} />
      <Sparkle x={220} y={1400} r={30} color={B.mint} />
      <Sparkle x={760} y={860} r={26} />
      <ellipse cx={540} cy={1562} rx={250} ry={20} fill={B.ink} opacity={0.12} />
      <g transform={`translate(${540 - 120 * 2.6} ${1560 - 322 * 2.6}) scale(2.6)`}>
        <Fiti armL={ARMS.down} armR={ARMS.chin} face="dusunceli" tilt={4} />
      </g>
    </Stage>
    <div style={{position: 'absolute', left: 80, top: 230}}>
      <div style={{display: 'inline-block', background: B.ink, color: B.mint, fontFamily: mono, fontWeight: 600, fontSize: 30, letterSpacing: 3, padding: '13px 30px', borderRadius: 999}}>
        CANIVIBECODEIT.COM
      </div>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 112, lineHeight: 1, letterSpacing: -3.5, color: B.ink, marginTop: 40}}>
        Kendim mi
        <br />
        <span style={{color: B.orange, background: B.lemon, borderRadius: 16, padding: '0 18px', marginLeft: -18}}>yaparım,</span>
        <br />
        para mı öderim?
      </div>
    </div>
  </AbsoluteFill>
);
