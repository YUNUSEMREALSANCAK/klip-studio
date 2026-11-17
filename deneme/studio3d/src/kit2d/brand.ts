import {loadFont as loadDisplay} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadBody} from '@remotion/google-fonts/Figtree';
import {loadFont as loadMono} from '@remotion/google-fonts/MartianMono';
import {interpolate} from 'remotion';

/* Fityazılım yeni marka kimliği (2026-11): maskot Fiti, 2D düz hareketli grafik.
   Kaynak: ~/Desktop/Fityazilim_Instagram/marka_kimligi/avatar_2d (3D sürüm: kit/three/FitiToy.tsx) */

// Türkçe karakterler (ğ, ş, ı, İ) latin-ext alt kümesinde
export const {fontFamily: display} = loadDisplay('normal', {weights: ['600', '800'], subsets: ['latin', 'latin-ext']});
export const {fontFamily: body} = loadBody('normal', {weights: ['400', '600', '800'], subsets: ['latin', 'latin-ext']});
export const {fontFamily: mono} = loadMono('normal', {weights: ['400', '600'], subsets: ['latin', 'latin-ext']});

export const B = {
  orange: '#FF5A1F',
  orangeLight: '#FF8A55',
  orangeDark: '#D9420F',
  ink: '#1E1433',
  ink2: '#2E2150',
  ink3: '#3B2B66',
  mint: '#7CF2C4',
  mintDark: '#4FCB9C',
  lemon: '#FFD23F',
  paper: '#F6F3FF',
  white: '#FFFFFF',
  muted: '#6B6188',
  cheek: '#FFB59A',
  bump: '#FFC2A8',
  sky: '#CFF6FF',
};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Hafif taşan giriş (pop) */
export const easeBack = (x: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

/** t anında [at, at+dur] aralığındaki ilerleme (0..1) */
export const prog = (t: number, at: number, dur = 0.35) => interpolate(t, [at, at + dur], [0, 1], clamp);
/** Pop giriş: 0 → 1 (taşarak) */
export const pop = (t: number, at: number, dur = 0.4) => easeBack(prog(t, at, dur));
/** Görünürlük: at'ta girer, to'da çıkar */
export const life = (t: number, at: number, to: number, fadeIn = 0.3, fadeOut = 0.25) =>
  Math.min(easeOut(prog(t, at, fadeIn)), 1 - prog(t, to - fadeOut, fadeOut));
