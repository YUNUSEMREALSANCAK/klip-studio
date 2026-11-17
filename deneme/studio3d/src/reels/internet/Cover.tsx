import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {S1Computer} from './scenes/S1Computer';
import {C, fontFamily, mono, sec} from '../../kit/theme';

/* Kapak: ekranın içindeki veri tüneli + başlık. Profil ızgarasında 3:4 kırpılır, yazı ortada kalır. */

const TUNNEL_AT = 8.0;

export const Cover: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.bg}}>
    <Sequence from={-sec(TUNNEL_AT)}>
      <S1Computer />
    </Sequence>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(2,6,17,0.72) 0%, rgba(2,6,17,0.25) 55%, rgba(2,6,17,0) 75%)'}} />
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 140}}>
      <div style={{fontFamily: mono, fontWeight: 700, fontSize: 40, color: C.bg, background: C.cyan, padding: '10px 26px', borderRadius: 14, boxShadow: `0 0 40px ${C.cyan}`}}>3D YOLCULUK</div>
      <div style={{marginTop: 40, fontFamily, fontWeight: 900, fontSize: 150, lineHeight: 0.98, color: C.white, textAlign: 'center', letterSpacing: -5, textShadow: '0 0 50px rgba(34,227,255,0.55)'}}>
        İnternet
        <br />
        <span style={{color: C.cyan}}>nasıl</span> çalışır?
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
