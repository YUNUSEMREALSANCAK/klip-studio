import React from 'react';
import {FitiTrack as Track, type PoseKey, type Spot} from '../../kit2d/FitiTrack';
import {MOUTH} from './mouth';
import {ANKET, AVT, DEG, DEGER, GEL, HOOK, OUTRO_AT, PROB, SCENES, SEKTOR, SERT, SORU, TOKEN} from './timeline';

/* Fiti'nin bu reeldeki yerleri ve pozları (hareket motoru: kit2d/FitiTrack.tsx).
   Sağdayken sol kolla (l), soldayken sağ kolla (r) içeriği gösterir. */

const L = 290;
const R = 790;
const C = 540;
const FOOT = 1540;

const SPOTS: Spot[] = [
  {t: 0, x: C, y: FOOT, s: 2.4},
  {t: SCENES.degisti[0], x: R, y: FOOT, s: 2.0},
  {t: SCENES.deger[0], x: L, y: FOOT, s: 2.0},
  {t: SCENES.token[0], x: R, y: FOOT, s: 2.0},
  {t: SCENES.sektor[0], x: C, y: FOOT, s: 1.9},
  {t: SCENES.avantaj[0], x: L, y: FOOT, s: 1.9},
  {t: SCENES.problem[0], x: R, y: FOOT, s: 2.0},
  {t: SCENES.sertifika[0], x: L, y: FOOT, s: 2.0},
  {t: SCENES.soru[0], x: R, y: FOOT, s: 2.0},
  {t: SCENES.gelecek[0], x: R, y: FOOT, s: 2.0},
  {t: SCENES.anket[0], x: L, y: FOOT, s: 2.0},
];

const POSES: PoseKey[] = [
  {t: 0, l: 'down', r: 'down', face: 'mutlu'},
  {t: HOOK.yazilimci, l: 'flex', r: 'flex', face: 'nese'},
  {t: HOOK.yeterli, l: 'down', r: 'chin', face: 'endiseli', tilt: 4},
  // Değişim
  {t: SCENES.degisti[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: DEG.kod, l: 'point_up', r: 'down', face: 'saskin', tilt: -4},
  {t: DEG.ben, l: 'down', r: 'down', face: 'mutlu', tilt: -2},
  {t: DEG.hatirlamiyorum, l: 'chin', r: 'down', face: 'dusunceli', tilt: -4},
  // Yeni değer
  {t: SCENES.deger[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: DEGER.ne, l: 'down', r: 'point_up', face: 'goz_kirpma', tilt: 3},
  // Token → para
  {t: SCENES.token[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: TOKEN.tokenleri, l: 'point_side', r: 'down', face: 'saskin', tilt: -3},
  {t: TOKEN.cevirebilmek, l: 'up', r: 'up', face: 'nese'},
  // Sektör
  {t: SCENES.sektor[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SEKTOR.mesela, l: 'point_up', r: 'point_up', face: 'mutlu'},
  {t: SEKTOR.fitness, l: 'flex', r: 'flex', face: 'nese'},
  // Avantaj
  {t: SCENES.avantaj[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: AVT.bilgi, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: AVT.problemi, l: 'down', r: 'chin', face: 'dusunceli', tilt: 4},
  {t: AVT.avantajin, l: 'up', r: 'up', face: 'nese'},
  // Asıl mesele
  {t: SCENES.problem[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: PROB.degil, l: 'point_up', r: 'down', face: 'saskin', tilt: -3},
  {t: PROB.para, l: 'point_up', r: 'down', face: 'goz_kirpma', tilt: -3},
  // Sertifika yerine
  {t: SCENES.sertifika[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SERT.python, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: SERT.yerine, l: 'down', r: 'down', face: 'saskin'},
  {t: SERT.kendinize, l: 'down', r: 'point_side', face: 'goz_kirpma', tilt: 3},
  // Kendine sor
  {t: SCENES.soru[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SORU.hangi, l: 'chin', r: 'down', face: 'dusunceli', tilt: -4},
  {t: SORU.herkesten, l: 'point_up', r: 'down', face: 'saskin', tilt: -3},
  // Gelecek
  {t: SCENES.gelecek[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: GEL.yapay, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: GEL.kazanacak, l: 'flex', r: 'flex', face: 'nese'},
  // Anket
  {t: SCENES.anket[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: ANKET.gelecegi, l: 'down', r: 'chin', face: 'dusunceli', tilt: 4},
  {t: ANKET.yorumlara, l: 'down', r: 'point_side', face: 'goz_kirpma', tilt: 3},
];

export const FitiTrack: React.FC = () => <Track spots={SPOTS} poses={POSES} mouth={MOUTH} hideAfter={OUTRO_AT + 0.5} />;
