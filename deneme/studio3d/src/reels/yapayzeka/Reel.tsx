import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';
import {FitiOutro} from '../../kit2d/ui';
import {FitiTrack} from './FitiTrack';
import {Overlay} from './overlay/Overlay';
import {Anthropic} from './scenes/Anthropic';
import {Carbon} from './scenes/Carbon';
import {End} from './scenes/End';
import {Genie} from './scenes/Genie';
import {Intro} from './scenes/Intro';
import {SceneShell} from '../../kit2d/shapes';
import {Terra} from './scenes/Terra';
import {Turkiye} from './scenes/Turkiye';
import {OUTRO_AT, SCENES, XFADE, type SceneKey} from './timeline';

const SCENE_VIEWS: Record<SceneKey, React.FC> = {
  intro: Intro,
  carbon: Carbon,
  terra: Terra,
  anthropic: Anthropic,
  genie: Genie,
  turkiye: Turkiye,
  end: End,
};

/**
 * mode: full = bitmiş video · clean = yalnızca sahneler ve Fiti (yazısız, sessiz) ·
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
      {mode === 'full' ? <Audio src={staticFile('reels/yapayzeka/ses_final.m4a')} /> : null}
    </AbsoluteFill>
  );
};
