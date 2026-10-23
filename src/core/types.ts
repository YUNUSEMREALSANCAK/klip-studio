// Proje modeli: CapCut'taki tracks → segments → materials fikrinin sade hâli.

export type AssetKind = 'video' | 'audio' | 'image';

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  file: Blob;
  url: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  thumbnail?: string;
}

export type TrackId = 'main' | 'overlay' | 'text' | 'audio';

export interface FilterSettings {
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  temperature: number; // -1..1
  vignette: number; // 0..1
  sharpen: number; // 0..1
  grayscale: boolean;
  lutId?: string;
  lutIntensity: number; // 0..1
}

export interface Transition {
  type: TransitionType;
  duration: number;
}

export type TransitionType =
  | 'fade'
  | 'fadeblack'
  | 'slideleft'
  | 'slideright'
  | 'slideup'
  | 'wipeleft'
  | 'wiperight'
  | 'circleopen'
  | 'zoomin'
  | 'pixelize'
  | 'radial'
  | 'blur';

export interface Transform {
  x: number; // merkez, 0..1
  y: number; // merkez, 0..1
  scale: number; // tuvale göre genişlik oranı
  rotation: number; // derece
}

export type KeyframeProp = 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume';

export interface Keyframe {
  prop: KeyframeProp;
  time: number; // klibin başından itibaren saniye
  value: number;
}

export interface MaskSettings {
  shape: 'rect' | 'ellipse' | 'linear';
  x: number; // katman içinde merkez, 0..1
  y: number;
  width: number; // katmana oran
  height: number;
  feather: number; // 0..0.5
  invert: boolean;
}

export interface ChromaSettings {
  color: string;
  similarity: number; // 0..1
  smoothness: number; // 0..1
}

export interface Lut {
  id: string;
  name: string;
  size: number;
  data: string; // base64, size³ × RGB bayt
}

// Otomatik çerçeveleme: zamana göre yatay odak noktası (kaynak saniyesi → 0..1)
export interface ReframeTrack {
  times: number[];
  centers: number[];
}

export interface MediaClip {
  id: string;
  type: 'media';
  track: 'main' | 'overlay' | 'audio';
  assetId: string;
  start: number; // zaman çizelgesindeki başlangıç (sn)
  in: number; // kaynaktaki başlangıç (sn)
  duration: number;
  volume: number; // 0..2
  muted: boolean;
  filter: FilterSettings;
  transition?: Transition; // önceki klipten bu klibe geçiş (yalnız ana iz)
  removeBackground: boolean;
  transform: Transform;
  reframe?: ReframeTrack;
  speed: number; // 0.25..4
  opacity: number; // 0..1
  keyframes: Keyframe[];
  mask?: MaskSettings;
  chroma?: ChromaSettings;
  fadeIn: number; // sn
  fadeOut: number; // sn
  duck: boolean; // konuşma olduğunda sesi kıs
  smoothSlowMo: boolean; // yavaşlatmada kare harmanlama (dışa aktarmada)
  speedCurve?: SpeedCurve; // varsa speed, eğrinin ortalamasıdır
}

// Klip içinde değişen hız: u = klip süresine göre konum (0..1), speed = o andaki hız.
export interface SpeedCurve {
  name: string;
  points: { u: number; speed: number }[];
}

export type TextStylePreset = 'classic' | 'box' | 'karaoke' | 'neon' | 'title';
export type TextAnimation = 'none' | 'fade' | 'pop' | 'typewriter' | 'slideup';

export interface Word {
  text: string;
  start: number; // zaman çizelgesi saniyesi
  end: number;
}

export interface TextClip {
  id: string;
  type: 'text';
  track: 'text';
  start: number;
  duration: number;
  text: string;
  preset: TextStylePreset;
  animation: TextAnimation;
  color: string;
  highlight: string;
  fontSize: number; // tuval yüksekliğine oran
  font?: string; // Google Fonts ailesi
  y: number; // 0..1
  words?: Word[];
}

export type Clip = MediaClip | TextClip;

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface Project {
  aspect: AspectRatio;
  fps: number;
  background: string;
  backgroundBlur: boolean; // boşlukları videonun bulanık hâliyle doldur
  clips: Clip[];
  markers: number[];
  luts: Record<string, Lut>;
}

export const DEFAULT_FILTER: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  vignette: 0,
  sharpen: 0,
  grayscale: false,
  lutIntensity: 1,
};

export const DEFAULT_TRANSFORM: Transform = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };

export const ASPECT_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};
