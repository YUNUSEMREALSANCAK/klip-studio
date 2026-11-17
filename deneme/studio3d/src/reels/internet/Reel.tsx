import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Outro} from '../../kit/Outro';
import {Overlay} from './overlay/Overlay';
import {S1Computer} from './scenes/S1Computer';
import {S2Globe} from './scenes/S2Globe';
import {S3Dns} from './scenes/S3Dns';
import {S4Handshake} from './scenes/S4Handshake';
import {S5Packets} from './scenes/S5Packets';
import {S6Server} from './scenes/S6Server';
import {S7Back} from './scenes/S7Back';
import {S8Render} from './scenes/S8Render';
import {S9Finale} from './scenes/S9Finale';
import {C, sec} from '../../kit/theme';
import {OUTRO_AT, SCENES, XFADE, type SceneKey} from './timeline';

const SCENE_VIEWS: Record<SceneKey, React.FC> = {
  computer: S1Computer,
  globe: S2Globe,
  dns: S3Dns,
  handshake: S4Handshake,
  packets: S5Packets,
  server: S6Server,
  back: S7Back,
  render: S8Render,
  finale: S9Finale,
};

/** Komşu sahneler kısa bir ışık geçişiyle (crossfade) birbirine bağlanır */
const SceneShell: React.FC<{children: React.ReactNode; first: boolean}> = ({children, first}) => {
  const f = useCurrentFrame();
  const opacity = first ? 1 : interpolate(f, [0, sec(XFADE)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

/**
 * mode: full = bitmiş video · clean = yalnızca 3D sahneler (etiketsiz, sessiz) ·
 * overlay = yalnızca etiket katmanı, şeffaf arka plan (part: tek bir parça)
 */
export type ReelProps = {mode?: 'full' | 'clean' | 'overlay'; part?: string};

export const Reel: React.FC<ReelProps> = ({mode = 'full', part}) => {
  const keys = Object.keys(SCENES) as SceneKey[];
  const scenes = mode !== 'overlay';
  const overlay = mode !== 'clean';
  return (
    <AbsoluteFill style={{backgroundColor: scenes ? C.bg : 'transparent'}}>
      {scenes && keys.map((k, i) => {
        const View = SCENE_VIEWS[k];
        const [from, to] = SCENES[k];
        return (
          <Sequence key={k} name={k} from={sec(from)} durationInFrames={sec(to) - sec(from)} premountFor={sec(1)}>
            <SceneShell first={i === 0}>
              <View />
            </SceneShell>
          </Sequence>
        );
      })}
      {overlay && part !== 'outro' ? <Overlay part={part} /> : null}
      {overlay && (!part || part === 'outro') ? (
        <Sequence name="Kapanış" from={sec(OUTRO_AT)} layout="none">
          <Outro />
        </Sequence>
      ) : null}
      {/* Seslendirme + gerçek kayıtlardan ses tasarımı (real-sfx) */}
      {mode === 'full' ? <Audio src={staticFile('reels/internet/ses_final.m4a')} /> : null}
    </AbsoluteFill>
  );
};
