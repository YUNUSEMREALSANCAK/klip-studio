import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';
import {SceneShell} from '../../kit2d/shapes';
import {FitiOutro} from '../../kit2d/ui';
import {FitiTrack} from './FitiTrack';
import {Overlay} from './overlay/Overlay';
import {Hook} from './scenes/Hook';
import {Site} from './scenes/Site';
import {Liste} from './scenes/Liste';
import {Ornek} from './scenes/Ornek';
import {Secim} from './scenes/Secim';
import {Terazi} from './scenes/Terazi';
import {Kinda} from './scenes/Kinda';
import {Detay} from './scenes/Detay';
import {Cta} from './scenes/Cta';
import {Son} from './scenes/Son';
import {OUTRO_AT, SCENES, XFADE, type SceneKey} from './timeline';

const SCENE_VIEWS: Record<SceneKey, React.FC> = {
  hook: Hook,
  site: Site,
  liste: Liste,
  ornek: Ornek,
  secim: Secim,
  terazi: Terazi,
  kinda: Kinda,
  detay: Detay,
  cta: Cta,
  son: Son,
};

/**
 * mode: full = bitmiş video (seslendirmeyle) · clean = yalnızca sahneler ve Fiti ·
 * overlay = yalnızca yazı katmanı, şeffaf arka plan (part: tek bir parça)
 */
export type ReelProps = {mode?: 'full' | 'clean' | 'overlay'; part?: string};

export const Reel: React.FC<ReelProps> = ({mode = 'full', part}) => {
  const keys = Object.keys(SCENES) as SceneKey[];
  const scenes = mode !== 'overlay';
  const overlay = mode !== 'clean';
  return (
    <AbsoluteFill style={{backgroundColor: scenes ? B.paper : 'transparent'}}>
      {scenes &&
        keys.map((k, i) => {
          const View = SCENE_VIEWS[k];
          const [from, to] = SCENES[k];
          return (
            <Sequence key={k} name={k} from={sec(from)} durationInFrames={sec(to) - sec(from)} premountFor={sec(1)}>
              <SceneShell first={i === 0} dur={XFADE}>
                <View />
              </SceneShell>
            </Sequence>
          );
        })}
      {scenes ? <FitiTrack /> : null}
      {overlay && part !== 'outro' ? <Overlay part={part} /> : null}
      {overlay && (!part || part === 'outro') ? (
        <Sequence name="Kapanış" from={sec(OUTRO_AT)} layout="none">
          <FitiOutro />
        </Sequence>
      ) : null}
      {mode === 'full' ? <Audio src={staticFile('reels/vibecode/seslendirme.mp3')} /> : null}
    </AbsoluteFill>
  );
};
