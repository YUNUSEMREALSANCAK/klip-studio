import { DEFAULT_TRANSFORM, type Crop, type Keyframe, type KeyframeProp, type MediaClip, type Transform } from './types';

// One-click motion and layout presets, built on keyframes, transform and crop (pure functions).

export type MotionPreset = 'zoomin' | 'zoomout' | 'panleft' | 'panright' | 'panup' | 'pandown' | 'none';

export const MOTION_PRESETS: [MotionPreset, string][] = [
  ['zoomin', 'Slow zoom in'],
  ['zoomout', 'Slow zoom out'],
  ['panleft', 'Pan left'],
  ['panright', 'Pan right'],
  ['panup', 'Pan up'],
  ['pandown', 'Pan down'],
  ['none', 'No motion'],
];

const MOTION_PROPS: KeyframeProp[] = ['x', 'y', 'scale'];
const ZOOM = 1.15;
const PAN = 0.05; // of the canvas, with the clip zoomed in enough to keep the edges covered

// Ken Burns style motion across the whole clip; replaces earlier position and size keyframes.
export function motionKeyframes(clip: MediaClip, preset: MotionPreset): Keyframe[] {
  const kept = clip.keyframes.filter((k) => !MOTION_PROPS.includes(k.prop));
  if (preset === 'none') return kept;
  const { x, y, scale } = clip.transform;
  const end = clip.duration;
  const pair = (prop: KeyframeProp, from: number, to: number): Keyframe[] => [
    { prop, time: 0, value: from },
    { prop, time: end, value: to },
  ];
  const moves: Record<Exclude<MotionPreset, 'none'>, Keyframe[]> = {
    zoomin: pair('scale', scale, scale * ZOOM),
    zoomout: pair('scale', scale * ZOOM, scale),
    panleft: [...pair('scale', scale * ZOOM, scale * ZOOM), ...pair('x', x + PAN, x - PAN)],
    panright: [...pair('scale', scale * ZOOM, scale * ZOOM), ...pair('x', x - PAN, x + PAN)],
    panup: [...pair('scale', scale * ZOOM, scale * ZOOM), ...pair('y', y + PAN, y - PAN)],
    pandown: [...pair('scale', scale * ZOOM, scale * ZOOM), ...pair('y', y - PAN, y + PAN)],
  };
  return [...kept, ...moves[preset]];
}

export type LayoutPreset = 'full' | 'top' | 'bottom' | 'left' | 'right' | 'pip-tl' | 'pip-tr' | 'pip-bl' | 'pip-br';

export const LAYOUT_PRESETS: [LayoutPreset, string][] = [
  ['full', 'Full screen'],
  ['top', 'Top half'],
  ['bottom', 'Bottom half'],
  ['left', 'Left half'],
  ['right', 'Right half'],
  ['pip-tl', 'Top left'],
  ['pip-tr', 'Top right'],
  ['pip-bl', 'Bottom left'],
  ['pip-br', 'Bottom right'],
];

const BOXES: Partial<Record<LayoutPreset, [number, number, number, number]>> = {
  full: [0, 0, 1, 1],
  top: [0, 0, 1, 0.5],
  bottom: [0, 0.5, 1, 0.5],
  left: [0, 0, 0.5, 1],
  right: [0.5, 0, 0.5, 1],
};
const PIP_MARGIN = 0.04; // of the canvas width

// An overlay's transform (and crop) for a layout. Halves and full screen fill their box by cropping the
// source (like CapCut's split screen); corners keep the whole picture as a small window.
export function layoutFor(preset: LayoutPreset, srcWidth: number, srcHeight: number, W: number, H: number): { transform: Transform; crop?: Crop } {
  const srcAspect = srcWidth / srcHeight;
  const box = BOXES[preset];
  if (box) {
    const [bx, by, bw, bh] = box;
    const boxAspect = (bw * W) / (bh * H);
    let crop: Crop | undefined;
    if (srcAspect > boxAspect * 1.001) {
      const width = boxAspect / srcAspect;
      crop = { x: (1 - width) / 2, y: 0, width, height: 1 };
    } else if (srcAspect < boxAspect / 1.001) {
      const height = srcAspect / boxAspect;
      crop = { x: 0, y: (1 - height) / 2, width: 1, height };
    }
    return { transform: { ...DEFAULT_TRANSFORM, x: bx + bw / 2, y: by + bh / 2, scale: bw }, crop };
  }
  const width = srcAspect >= 1 ? 0.42 : 0.3;
  const height = (width * W) / srcAspect / H;
  const marginY = (PIP_MARGIN * W) / H;
  const right = preset === 'pip-tr' || preset === 'pip-br';
  const bottom = preset === 'pip-bl' || preset === 'pip-br';
  return {
    transform: {
      ...DEFAULT_TRANSFORM,
      x: right ? 1 - PIP_MARGIN - width / 2 : PIP_MARGIN + width / 2,
      y: bottom ? 1 - marginY - height / 2 : marginY + height / 2,
      scale: width,
    },
  };
}

// Points in time to cut at: the markers that fall inside the clip.
export const markersInside = (clip: { start: number; duration: number }, markers: number[]) =>
  [...new Set(markers)].filter((m) => m > clip.start + 0.05 && m < clip.start + clip.duration - 0.05).sort((a, b) => a - b);
