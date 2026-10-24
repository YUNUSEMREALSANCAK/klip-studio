import type { Crop, TextClip, Transform } from '../core/types';
import { applyTextStyle, wrapWords } from './text';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Size of the visible part of a source after cropping.
export const croppedSize = (width: number, height: number, crop?: Crop) =>
  crop ? { width: width * crop.width, height: height * crop.height } : { width, height };

// An overlay's rectangle on the canvas (pixels). Used by both rendering and preview selection.
export function overlayRect(transform: Transform, srcWidth: number, srcHeight: number, W: number, H: number): Rect {
  const w = W * transform.scale;
  const h = w * (srcHeight / srcWidth);
  return { x: transform.x * W - w / 2, y: transform.y * H - h / 2, w, h };
}

// A main-track clip's rectangle: fit (contain) or fill (cover) the canvas, then the user's scale.
export function fitRect(transform: Transform, srcWidth: number, srcHeight: number, W: number, H: number, mode: 'contain' | 'cover', focusX?: number): Rect {
  const fit = mode === 'cover' ? Math.max(W / srcWidth, H / srcHeight) : Math.min(W / srcWidth, H / srcHeight);
  const w = srcWidth * fit * transform.scale;
  const h = srcHeight * fit * transform.scale;
  let x = transform.x * W - w / 2;
  if (mode === 'cover' && focusX !== undefined) x = Math.min(0, Math.max(W - w, W / 2 - focusX * w));
  return { x, y: transform.y * H - h / 2, w, h };
}

let measureCtx: CanvasRenderingContext2D | null = null;

// A text clip's box without animation (pixels).
export function textRect(clip: TextClip, W: number, H: number): Rect {
  measureCtx ??= document.createElement('canvas').getContext('2d')!;
  const size = clip.fontSize * H;
  applyTextStyle(measureCtx, clip, size);
  const text = clip.preset === 'title' ? clip.text.toUpperCase() : clip.text;
  const lines = wrapWords(measureCtx, text.split(/\s+/).filter(Boolean), W * 0.86);
  const width = Math.max(...lines.map((l) => measureCtx!.measureText(l.join(' ')).width), size);
  const height = lines.length * size * 1.25;
  return { x: W / 2 - width / 2, y: clip.y * H - height / 2, w: width, h: height };
}
