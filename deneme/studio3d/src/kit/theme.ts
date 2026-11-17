import {loadFont} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {Color} from 'three';

// Türkçe karakterler (ğ, ş, ı, İ) latin-ext alt kümesinde
export const {fontFamily} = loadFont('normal', {
  weights: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin', 'latin-ext'],
});
export const {fontFamily: mono} = loadMono('normal', {weights: ['400', '500', '700'], subsets: ['latin', 'latin-ext']});

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Brief paleti: gece mavisi, elektrik cyan, parlak mavi, ince mor vurgular, beyaz ışık */
export const C = {
  bg: '#020611',
  fog: '#081a40',
  navy: '#061127',
  navy2: '#0b1b3d',
  steel: '#1a2a4a',
  cyan: '#22e3ff',
  cyanSoft: '#67e8f9',
  blue: '#3b82f6',
  blueGlow: '#4f8cff',
  violet: '#8b5cf6',
  purple: '#b26cff',
  white: '#f4f9ff',
};

/** Bloom'a takılan HDR renk (1'in üstü parlar) */
export const hdr = (hex: string, k = 1) => new Color(hex).multiplyScalar(k);

export const sec = (s: number) => Math.round(s * FPS);
