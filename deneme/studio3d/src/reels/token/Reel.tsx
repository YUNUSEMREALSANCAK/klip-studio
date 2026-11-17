import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';
import {SceneShell} from '../../kit2d/shapes';
import {FitiOutro} from '../../kit2d/ui';
import {FitiTrack} from './FitiTrack';
import {Overlay} from './overlay/Overlay';
import {Anket} from './scenes/Anket';
import {Avantaj} from './scenes/Avantaj';
import {Deger} from './scenes/Deger';
import {Degisti} from './scenes/Degisti';
import {Gelecek} from './scenes/Gelecek';
import {Hook} from './scenes/Hook';
import {Problem} from './scenes/Problem';
import {Sektor} from './scenes/Sektor';
import {Sertifika} from './scenes/Sertifika';
import {Soru} from './scenes/Soru';
import {Token} from './scenes/Token';
import {OUTRO_AT, SCENES, XFADE, type SceneKey} from './timeline';

const SCENE_VIEWS: Record<SceneKey, React.FC> = {
  hook: Hook,
  degisti: Degisti,
  deger: Deger,
  token: Token,
  sektor: Sektor,
  avantaj: Avantaj,
  problem: Problem,
  sertifika: Sertifika,
  soru: Soru,
  gelecek: Gelecek,
  anket: Anket,
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
      {mode === 'full' ? <Audio src={staticFile('reels/token/seslendirme.mp3')} /> : null}
    </AbsoluteFill>
  );
};
