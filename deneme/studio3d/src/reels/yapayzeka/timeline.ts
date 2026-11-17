import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sec} from '../../kit/theme';
import {B} from '../../kit2d/brand';

/* Fityazılım 04 · Yapay zekada bu hafta (26 Ekim – 2 Kasım 2026).
   Saniyeler seslendirmenin whisper çıktısından (public/reels/yapayzeka/kelimeler.json). */

/** Sahne aralıkları [başlangıç, bitiş]. Yeni sahne XFADE süresince öncekinin üstüne kayarak girer. */
export const SCENES = {
  intro: [0, 4.8],
  carbon: [4.4, 14.05],
  terra: [13.65, 26.85],
  anthropic: [26.45, 41.2],
  genie: [40.8, 51.15],
  turkiye: [50.75, 68.95],
  end: [68.55, 80.6],
} as const;

export type SceneKey = keyof typeof SCENES;
export const XFADE = 0.4;
export const OUTRO_AT = 77.1;
export const TOTAL_FRAMES = sec(80.6);

/** Sahne zemini (yazı rengi buna göre seçilir) */
export const SCENE_BG: Record<SceneKey, string> = {
  intro: B.paper,
  carbon: B.paper,
  terra: B.lemon,
  anthropic: B.ink,
  genie: B.paper,
  turkiye: B.paper,
  end: B.lemon,
};

/* Kelime zamanları (sn) */
export const INTRO = {dunya: 0.64, buHafta: 1.36, neler: 1.83, son: 3.14, turkiye: 3.41};
export const CARBON = {start: 4.8, google: 4.92, gemini: 6.44, duyuruldu: 7.47, kodlama: 8.74, siber: 9.06, one: 10.02, beta: 11.26, ekipler: 12.32, aciliyor: 12.92};
export const TERRA = {start: 14.1, chatgpt: 14.22, bilgisayar: 14.95, yerine: 16.22, openai: 18.38, gpt: 18.65, yayinladi: 20.4, ekrani: 21.82, uygulamalar: 22.46, gecis: 23.62, adina: 24.96, islem: 25.15};
export const ANT = {start: 26.92, claude: 27.25, halkaArz: 29.1, anthropic: 30.86, basvurdu: 32.09, yilin: 33.18, sayi: 34.11, gelir: 35.66, kasim: 38.08, nasdaq: 38.82, bekleniyor: 40.18};
export const GENIE = {start: 41.26, cumle: 42.29, yasayan: 42.75, donusturuyor: 43.88, deepmind: 45.46, genie: 45.82, tek: 47.62, gezebilecegin: 48.57, olusturuyor: 49.83};
export const TR = {start: 51.22, turkiye: 51.86, gelisme: 53.24, rekabet: 54.04, google: 54.96, ozetler: 56.14, sorusturma: 57.19, tedbir: 58.97, haber: 60.62, reddedebilecek: 63.65, ustelik: 64.82, arama: 65.48, geriPlana: 66.5, hedefleniyor: 67.76};
export const END = {peki: 69.08, hangisi: 69.94, sasirtti: 71.13, yorumlara: 72.28, herHafta: 73.28, takip: 76.59};

/** Sahnenin içinde seslendirmeyle aynı (global) saniye */
export const useSceneTime = (key: SceneKey) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return SCENES[key][0] + frame / fps;
};

export const sceneAt = (t: number): SceneKey => {
  const keys = Object.keys(SCENES) as SceneKey[];
  let current: SceneKey = 'intro';
  for (const k of keys) if (t >= SCENES[k][0] + XFADE / 2) current = k;
  return current;
};
