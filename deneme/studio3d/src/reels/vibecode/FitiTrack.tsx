import React from 'react';
import {FitiTrack as Track, type PoseKey, type Spot} from '../../kit2d/FitiTrack';
import {MOUTH} from './mouth';
import {CTA, DETAY, HOOK, KINDA, LISTE, ORNEK, OUTRO_AT, SCENES, SECIM, SITE, SON, TERAZI} from './timeline';

/* Fiti'nin bu reeldeki yerleri ve pozları (hareket motoru: kit2d/FitiTrack.tsx).
   Ekran görüntülü sahnelerde küçülür ve pencerenin köşesinde durur.
   Sağdayken sol kolla (l), soldayken sağ kolla (r) içeriği gösterir. */

const L = 270;
const R = 810;
const C = 540;
const FOOT = 1540;

const SPOTS: Spot[] = [
  {t: 0, x: C, y: FOOT, s: 2.0},
  {t: SCENES.site[0], x: R, y: FOOT, s: 1.5},
  {t: SCENES.liste[0], x: L, y: FOOT, s: 1.5},
  {t: SCENES.ornek[0], x: R, y: FOOT, s: 1.5},
  {t: SCENES.secim[0], x: L, y: FOOT, s: 1.5},
  {t: SCENES.terazi[0], x: C, y: FOOT, s: 1.5},
  {t: SCENES.kinda[0], x: R, y: FOOT, s: 1.6},
  {t: SCENES.detay[0], x: R, y: FOOT, s: 1.5},
  {t: SCENES.cta[0], x: L, y: FOOT, s: 1.7},
  {t: SCENES.son[0], x: R, y: FOOT, s: 1.5},
];

const POSES: PoseKey[] = [
  {t: 0, l: 'down', r: 'down', face: 'mutlu'},
  {t: HOOK.kodlayabiliyorsan, l: 'point_up', r: 'down', face: 'nese', tilt: -3},
  {t: HOOK.hangi, l: 'down', r: 'chin', face: 'dusunceli', tilt: 4},
  // Gizli site
  {t: SCENES.site[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SITE.gizli, l: 'point_up', r: 'down', face: 'saskin', tilt: -3},
  {t: SITE.can, l: 'up', r: 'up', face: 'nese'},
  // 1.000+ uygulama
  {t: SCENES.liste[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: LISTE.karsina, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  {t: LISTE.binden, l: 'down', r: 'point_side', face: 'saskin', tilt: 3},
  // Örnekler
  {t: SCENES.ornek[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: ORNEK.capcut, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: ORNEK.kullandigin, l: 'chin', r: 'down', face: 'goz_kirpma', tilt: -4},
  // Seçim
  {t: SCENES.secim[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SECIM.seciyorsun, l: 'down', r: 'point_up', face: 'nese', tilt: 3},
  {t: SECIM.cevabini, l: 'down', r: 'point_up', face: 'mutlu', tilt: 3},
  // Terazi
  {t: SCENES.terazi[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: TERAZI.kendim, l: 'point_up', r: 'down', face: 'dusunceli', tilt: -4},
  {t: TERAZI.yoksa, l: 'down', r: 'point_up', face: 'endiseli', tilt: 4},
  {t: TERAZI.etmeliyim, l: 'chin', r: 'down', face: 'dusunceli', tilt: -3},
  // KINDA
  {t: SCENES.kinda[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: KINDA.evet, l: 'point_up', r: 'down', face: 'mutlu', tilt: -3},
  {t: KINDA.demiyor, l: 'flex', r: 'flex', face: 'nese'},
  // Detaylar
  {t: SCENES.detay[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: DETAY.kolayca, l: 'point_up', r: 'down', face: 'nese', tilt: -3},
  {t: DETAY.zorlanacagini, l: 'point_up', r: 'down', face: 'endiseli', tilt: -3},
  {t: DETAY.ihtiyac, l: 'chin', r: 'down', face: 'dusunceli', tilt: -4},
  // Kaydet ve gönder
  {t: SCENES.cta[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: CTA.kaydet, l: 'down', r: 'point_up', face: 'goz_kirpma', tilt: 3},
  {t: CTA.arkadasina, l: 'down', r: 'point_side', face: 'nese', tilt: 3},
  // Site adı
  {t: SCENES.son[0], l: 'down', r: 'down', face: 'mutlu'},
  {t: SON.can, l: 'wave', r: 'down', face: 'nese'},
];

export const FitiTrack: React.FC = () => <Track spots={SPOTS} poses={POSES} mouth={MOUTH} hideAfter={OUTRO_AT + 0.5} />;
