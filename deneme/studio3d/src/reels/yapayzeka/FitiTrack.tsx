import React from 'react';
import {FitiTrack as Track, type PoseKey, type Spot} from '../../kit2d/FitiTrack';
import {MOUTH} from './mouth';
import {ANT, CARBON, END, GENIE, INTRO, OUTRO_AT, SCENES, TERRA, TR} from './timeline';

/* Fiti'nin bu reeldeki yerleri ve pozları (hareket motoru: kit2d/FitiTrack.tsx) */

const SPOTS: Spot[] = [
  {t: 0, x: 540, y: 1560, s: 2.6},
  {t: SCENES.carbon[0], x: 290, y: 1540, s: 2.05},
  {t: SCENES.terra[0], x: 770, y: 1540, s: 1.95},
  {t: SCENES.anthropic[0], x: 290, y: 1540, s: 2.0},
  {t: SCENES.genie[0], x: 770, y: 1540, s: 2.0},
  {t: SCENES.turkiye[0], x: 290, y: 1540, s: 2.0},
  {t: SCENES.end[0], x: 650, y: 1540, s: 2.0},
];

const POSES: PoseKey[] = [
  {t: 0, l: 'down', r: 'down', face: 'saskin'},
  {t: INTRO.buHafta, l: 'point_up', r: 'down', face: 'saskin', tilt: -4},
  {t: INTRO.son, l: 'point_up', r: 'down', face: 'goz_kirpma', tilt: -3},
  {t: SCENES.carbon[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: CARBON.google, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: CARBON.one - 0.2, l: 'flex', r: 'flex', face: 'nese'},
  {t: CARBON.beta, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: SCENES.terra[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: TERRA.chatgpt, l: 'point_up', r: 'down', face: 'saskin', tilt: -4},
  {t: TERRA.yerine + 0.6, l: 'down', r: 'down', face: 'mutlu', tilt: -2},
  {t: TERRA.openai, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: TERRA.islem, l: 'up', r: 'up', face: 'nese'},
  {t: SCENES.anthropic[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: ANT.claude, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: ANT.halkaArz, l: 'down', r: 'point_up', face: 'saskin', tilt: 3},
  {t: ANT.anthropic, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: ANT.sayi, l: 'down', r: 'down', face: 'saskin'},
  {t: ANT.gelir, l: 'up', r: 'up', face: 'nese'},
  {t: ANT.kasim - 0.3, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: SCENES.genie[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: GENIE.start + 0.2, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: GENIE.donusturuyor, l: 'up', r: 'up', face: 'nese'},
  {t: GENIE.deepmind, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: GENIE.tek, l: 'down', r: 'down', face: 'mutlu', tilt: -2},
  {t: SCENES.turkiye[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: TR.turkiye, l: 'flex', r: 'flex', face: 'nese'},
  {t: TR.rekabet, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: TR.sorusturma, l: 'down', r: 'chin', face: 'dusunceli', tilt: 4},
  {t: TR.tedbir, l: 'down', r: 'down', face: 'saskin'},
  {t: TR.haber, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: TR.ustelik, l: 'down', r: 'up', face: 'nese', tilt: 2},
  {t: SCENES.end[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: END.peki, l: 'down', r: 'chin', face: 'dusunceli', tilt: 4},
  {t: END.yorumlara, l: 'down', r: 'point_side', face: 'goz_kirpma', tilt: 3},
  {t: END.herHafta, l: 'down', r: 'wave', face: 'nese', tilt: 4},
];

export const FitiTrack: React.FC = () => <Track spots={SPOTS} poses={POSES} mouth={MOUTH} hideAfter={OUTRO_AT + 0.5} />;
