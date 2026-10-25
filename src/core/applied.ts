import { sortedTrack } from './timeline';
import { DEFAULT_FILTER, type Clip, type MediaClip, type Project } from './types';

// Everything applied in the project — transitions, effects, speed, color, masks… — as a list in timeline order,
// so each one can be shown and adjusted on its own card.

export type AppliedKind =
  | 'transition'
  | 'effect'
  | 'color'
  | 'lut'
  | 'speed'
  | 'slowMotion'
  | 'fade'
  | 'blend'
  | 'crop'
  | 'mask'
  | 'chroma'
  | 'background'
  | 'keyframes'
  | 'textAnimation';

export interface AppliedItem {
  key: string;
  kind: AppliedKind;
  clipId: string;
  time: number; // where it happens on the timeline (s)
}

const COLOR_FIELDS = ['brightness', 'contrast', 'saturation', 'temperature', 'vignette', 'sharpen', 'grayscale'] as const;

export const hasColorAdjustment = (clip: MediaClip) => COLOR_FIELDS.some((f) => clip.filter[f] !== DEFAULT_FILTER[f]);

function mediaKinds(clip: MediaClip): AppliedKind[] {
  const checks: [AppliedKind, boolean][] = [
    ['effect', !!clip.filter.effectId],
    ['color', hasColorAdjustment(clip)],
    ['lut', !!clip.filter.lutId],
    ['speed', clip.speed !== 1 || !!clip.speedCurve],
    ['slowMotion', !!clip.slowMotion],
    ['fade', clip.fadeIn > 0 || clip.fadeOut > 0],
    ['blend', clip.track === 'overlay' && !!clip.blend && clip.blend !== 'normal'],
    ['crop', !!clip.crop],
    ['mask', !!clip.mask],
    ['chroma', !!clip.chroma],
    ['background', clip.removeBackground],
    ['keyframes', clip.keyframes.length > 0],
  ];
  return checks.filter(([, on]) => on).map(([kind]) => kind);
}

const kindsOf = (clip: Clip): AppliedKind[] => (clip.type === 'text' ? (clip.animation !== 'none' ? ['textAnimation'] : []) : mediaKinds(clip));

export function appliedItems(project: Project): AppliedItem[] {
  const items: AppliedItem[] = [];
  for (const clip of sortedTrack<MediaClip>(project.clips, 'main')) {
    if (clip.transition) items.push({ key: `${clip.id}:transition`, kind: 'transition', clipId: clip.id, time: clip.start });
  }
  for (const clip of project.clips) {
    for (const kind of kindsOf(clip)) items.push({ key: `${clip.id}:${kind}`, kind, clipId: clip.id, time: clip.start });
  }
  // Stable sort: by time, transitions first at the same moment, then in the order above.
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.time - b.item.time || a.i - b.i)
    .map(({ item }) => item);
}
