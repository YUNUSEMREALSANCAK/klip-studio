import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';

/* Fityazılım 05 · Tokenleri paraya çevirmek (yazılımcılığın geleceği).
   Seslendirme 1,05× hızlandırıldı, nefesler kesildi (63,1 sn).
   1,25× sürümden zaman_tasi.py haritasıyla taşındı.
   Saniyeler whisper çıktısından; virgül sonrası kelimeler sessizlik ölçümüyle düzeltildi. */

/** Sahne aralıkları [başlangıç, bitiş]. Yeni sahne XFADE süresince öncekinin üstüne kayarak girer. */
export const SCENES = {
  hook: [0.0, 5.58],
  degisti: [5.18, 13.15],
  deger: [12.75, 17.04],
  token: [16.64, 21.66],
  sektor: [21.26, 26.4],
  avantaj: [26.0, 35.28],
  problem: [34.88, 41.15],
  sertifika: [40.75, 47.22],
  soru: [46.82, 52.23],
  gelecek: [51.83, 58.4],
  anket: [58.0, 66.64],
} as const;

export type SceneKey = keyof typeof SCENES;
export const XFADE = 0.4;
export const OUTRO_AT = 63.09;
export const TOTAL_FRAMES = sec(66.64);

/** Sahne zemini (yazı rengi buna göre seçilir) */
export const SCENE_BG: Record<SceneKey, string> = {
  hook: B.paper,
  degisti: B.paper,
  deger: B.lemon,
  token: B.ink,
  sektor: B.paper,
  avantaj: B.lemon,
  problem: B.paper,
  sertifika: B.paper,
  soru: B.ink,
  gelecek: B.lemon,
  anket: B.paper,
};

/* Kelime zamanları (sn) */
export const HOOK = {sadece: 0.06, yazilimci: 0.71, para: 2.86, yeterli: 3.81, olmayabilir: 4.23};
export const DEG = {yapay: 5.43, kod: 6.29, tamamen: 7.49, degisti: 7.93, ben: 8.87, sifirdan: 9.88, for: 10.54, yazdim: 11.13, hatirlamiyorum: 11.49, bile: 12.32};
export const DEGER = {artik: 13.06, kodYazmak: 13.13, degil: 13.61, ne: 14.39, bilmek: 14.75, degerli: 15.35, geliyor: 16.07};
export const TOKEN = {bence: 16.91, asil: 17.23, yapay: 18.15, urettigi: 18.9, tokenleri: 19.32, paraya: 19.88, cevirebilmek: 20.25};
export const SEKTOR = {yazilim: 21.55, sektor: 22.21, dusun: 22.51, mesela: 23.23, saglik: 23.48, hukuk: 24.31, egitim: 24.81, fitness: 25.47};
export const AVT = {eger: 26.45, bilgi: 28.05, yapay: 29.06, kullanarak: 29.76, problemi: 31.66, iste: 33.04, ciddi: 33.52, avantajin: 34.0, var: 34.54};
export const PROB = {cunku: 35.16, mesele: 35.73, yazilim: 36.44, degil: 37.54, insanlarin: 38.01, para: 38.45, odemeye: 38.66, hazir: 39.06, problemi: 39.79, cozmek: 40.25};
export const SERT = {bu: 41.0, doksan: 41.56, gunde: 41.93, python: 42.23, sertifika: 43.02, calismak: 43.96, yerine: 44.4, kendinize: 45.2, soruyu: 45.75};
export const SORU = {ben: 47.11, hangi: 47.93, sektorde: 48.26, problemi: 49.25, herkesten: 49.79, anlayabilirim: 50.86};
export const GEL = {cunku: 52.07, gelecekte: 52.31, iyiKod: 53.2, yazanlar: 53.56, yapay: 54.72, gercek: 55.67, problemleri: 56.06, cozenler: 56.69, kazanacak: 57.15};
export const ANKET = {sizce: 58.25, gelecegi: 59.21, kodYazmak: 59.77, problem: 61.02, mi: 61.65, yorumlara: 62.15};

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
