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
  y: number; // 0..1
  words?: Word[];
}

export type Clip = MediaClip | TextClip;

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface Project {
  aspect: AspectRatio;
  fps: number;
  background: string;
  clips: Clip[];
  markers: number[];
}

export const DEFAULT_FILTER: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  vignette: 0,
  sharpen: 0,
  grayscale: false,
};

export const ASPECT_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};
