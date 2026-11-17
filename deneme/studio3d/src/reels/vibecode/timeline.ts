import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';

/* Fityazılım 06 · Can I Vibecode It? (canivibecodeit.com).
   Seslendirme 1,05× hızlandırıldı, nefesler kesildi (44,0 sn).
   Saniyeler whisper çıktısından; son "Can I vibe code it?" sessizlik ölçümünden. */

/** Sahne aralıkları [başlangıç, bitiş]. Yeni sahne XFADE süresince öncekinin üstüne kayarak girer. */
export const SCENES = {
  hook: [0.0, 5.3],
  site: [4.9, 8.95],
  liste: [8.55, 13.0],
  ornek: [12.6, 16.6],
  secim: [16.2, 19.9],
  terazi: [19.5, 25.45],
  kinda: [25.05, 28.3],
  detay: [27.9, 36.15],
  cta: [35.75, 41.75],
  son: [41.35, 47.6],
} as const;

export type SceneKey = keyof typeof SCENES;
export const XFADE = 0.4;
export const OUTRO_AT = 44.03;
export const TOTAL_FRAMES = sec(47.6);

/** Sahne zemini (yazı rengi buna göre seçilir) */
export const SCENE_BG: Record<SceneKey, string> = {
  hook: B.paper,
  site: B.lemon,
  liste: B.paper,
  ornek: B.lemon,
  secim: B.paper,
  terazi: B.ink,
  kinda: B.paper,
  detay: B.lemon,
  cta: B.ink,
  son: B.paper,
};

/* Kelime zamanları (sn) */
export const HOOK = {yapay: 0.08, her: 1.1, kodlayabiliyorsan: 1.57, hangi: 2.9, uygulamalara: 3.09, para: 3.64, odemeye: 3.83, devam: 4.16, edecegiz: 4.41};
export const SITE = {bu: 5.34, cevabi: 5.71, web: 6.36, sitesinde: 6.69, gizli: 7.24, can: 7.92, vibecode: 8.16, it: 8.63};
export const LISTE = {siteye: 9.16, giriyorsun: 9.4, karsina: 10.14, binden: 10.58, fazla: 10.98, populer: 11.3, uygulama: 11.75, cikiyor: 12.26};
export const ORNEK = {mesela: 13.22, capcut: 13.46, canva: 13.98, veya: 14.32, kullandigin: 14.61, baska: 15.38, yazilim: 16.11};
export const SECIM = {uygulamayi: 16.84, seciyorsun: 17.31, sana: 18.02, sorunun: 18.34, cevabini: 18.74, veriyor: 19.19};
export const TERAZI = {bunu: 20.1, yapay: 20.18, kendim: 21.27, gelistirebilir: 21.63, miyim: 22.48, yoksa: 23.0, uygulamaya: 23.42, para: 23.93, odemeye: 24.19, devam: 24.54, etmeliyim: 24.93};
export const KINDA = {ustelik: 25.7, sadece: 26.16, evet: 26.57, veya: 26.88, hayir: 27.1, demiyor: 27.45};
export const DETAY = {uygulamanin: 28.53, ozellik: 29.27, kolayca: 29.94, gelistirebilecegini: 30.3, nerelerde: 31.46, zorlanacagini: 32.05, neden: 33.06, hala: 33.37, ihtiyac: 34.02, duyabilecegini: 34.42, acikliyor: 35.3};
export const CTA = {daha: 36.4, incelemek: 36.73, kaydet: 37.59, aboneliklere: 38.56, bosuna: 38.92, para: 39.26, harcamamasi: 39.48, arkadasina: 40.57, gonder: 41.16};
export const SON = {can: 42.0, vibe: 42.09, code: 42.33, it: 42.69, bitis: 43.87};

/** Sahnenin içinde seslendirmeyle aynı (global) saniye */
export const useSceneTime = (key: SceneKey) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return SCENES[key][0] + frame / fps;
};

export const sceneAt = (t: number): SceneKey => {
  const keys = Object.keys(SCENES) as SceneKey[];
  let current: SceneKey = 'hook';
  for (const k of keys) if (t >= SCENES[k][0] + XFADE / 2) current = k;
  return current;
};
