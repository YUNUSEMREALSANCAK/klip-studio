import { describe, expect, it } from 'vitest';
import { appliedItems } from '../../src/core/applied';
import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type MediaClip, type Project } from '../../src/core/types';

const clip = (id: string, start: number, patch: Partial<MediaClip> = {}): MediaClip => ({
  id,
  type: 'media',
  track: 'main',
  assetId: 'a',
  start,
  in: 0,
  duration: 4,
  volume: 1,
  muted: false,
  filter: { ...DEFAULT_FILTER },
  removeBackground: false,
  transform: { ...DEFAULT_TRANSFORM },
  speed: 1,
  opacity: 1,
  keyframes: [],
  fadeIn: 0,
  fadeOut: 0,
  duck: false,
  ...patch,
});

const project = (clips: MediaClip[]): Project => ({
  aspect: '16:9',
  fps: 30,
  background: '#000000',
  backgroundBlur: false,
  clips,
  markers: [],
  luts: {},
  effects: {},
  fonts: {},
});

describe('appliedItems', () => {
  it('lists nothing for untouched clips', () => {
    expect(appliedItems(project([clip('a', 0), clip('b', 4)]))).toEqual([]);
  });

  it('lists transitions and features in timeline order, transitions first at the same moment', () => {
    const items = appliedItems(
      project([
        clip('c', 8, { transition: { type: 'fade', duration: 1 }, speed: 2 }),
        clip('a', 0, { filter: { ...DEFAULT_FILTER, effectId: 'lib_shake' }, fadeIn: 0.5 }),
        clip('b', 4, { transition: { type: 'slideleft', duration: 1, effectId: 'lib_t_swirl' }, filter: { ...DEFAULT_FILTER, contrast: 0.2 } }),
      ]),
    );
    expect(items.map((i) => `${i.clipId}:${i.kind}`)).toEqual(['a:effect', 'a:fade', 'b:transition', 'b:color', 'c:transition', 'c:speed']);
  });
});
