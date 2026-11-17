import { describe, expect, it } from 'vitest';
import { layoutFor, markersInside, motionKeyframes } from '../../src/core/presets';
import { createTextClip } from '../../src/core/timeline';
import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type MediaClip } from '../../src/core/types';
import { activeWord } from '../../src/render/text';

const clip = (patch: Partial<MediaClip> = {}): MediaClip => ({
  id: 'c',
  type: 'media',
  track: 'overlay',
  assetId: 'a',
  start: 2,
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

describe('motion presets', () => {
  it('zooms across the whole clip and keeps other keyframes', () => {
    const keys = motionKeyframes(clip({ keyframes: [{ prop: 'opacity', time: 1, value: 0.5 }] }), 'zoomin');
    expect(keys).toContainEqual({ prop: 'opacity', time: 1, value: 0.5 });
    expect(keys.filter((k) => k.prop === 'scale')).toEqual([
      { prop: 'scale', time: 0, value: 1 },
      { prop: 'scale', time: 4, value: 1.15 },
    ]);
  });

  it('pans with the picture zoomed in, and "none" removes the motion', () => {
    const pan = motionKeyframes(clip(), 'panleft');
    const x = pan.filter((k) => k.prop === 'x').map((k) => k.value);
    expect(x[0]).toBeGreaterThan(x[1]);
    expect(pan.filter((k) => k.prop === 'scale').every((k) => k.value > 1)).toBe(true);
    expect(motionKeyframes(clip({ keyframes: pan }), 'none')).toEqual([]);
  });
});

describe('layout presets', () => {
  it('fills the top half of a vertical canvas by cropping a landscape video', () => {
    const { transform, crop } = layoutFor('top', 1920, 1080, 1080, 1920);
    expect(transform).toMatchObject({ x: 0.5, y: 0.25, scale: 1 });
    // Box is 1080×960 (aspect 1.125); a 16:9 source keeps 1.125 / 1.778 of its width.
    expect(crop!.width).toBeCloseTo(1.125 / (16 / 9), 3);
    expect(crop!.x).toBeCloseTo((1 - crop!.width) / 2, 5);
  });

  it('puts a corner window inside the margins without cropping', () => {
    const { transform, crop } = layoutFor('pip-br', 1920, 1080, 1080, 1920);
    expect(crop).toBeUndefined();
    const heightShare = (transform.scale * 1080) / (16 / 9) / 1920;
    expect(transform.x + transform.scale / 2).toBeLessThan(1);
    expect(transform.y + heightShare / 2).toBeLessThan(1);
    expect(transform.x).toBeGreaterThan(0.5);
  });

  it('needs no crop when the source already has the box shape', () => {
    expect(layoutFor('full', 1080, 1920, 1080, 1920).crop).toBeUndefined();
  });
});

describe('markers and words', () => {
  it('cuts only at markers inside the clip', () => {
    expect(markersInside({ start: 2, duration: 4 }, [1, 2.02, 3, 3, 5.5, 7])).toEqual([3, 5.5]);
  });

  it('finds the spoken word from timings, or splits the duration evenly', () => {
    const timed = {
      ...createTextClip(0, 'one two three', 3),
      preset: 'karaoke' as const,
      words: [
        { text: 'one', start: 0, end: 0.5 },
        { text: 'two', start: 1, end: 1.5 },
        { text: 'three', start: 2, end: 3 },
      ],
    };
    expect(activeWord(timed, 1.2, 3)).toBe(1);
    expect(activeWord(timed, 0.7, 3)).toBe(-1); // karaoke: nothing between words
    expect(activeWord({ ...timed, preset: 'single' }, 0.7, 3)).toBe(0); // single keeps the last word
    const even = { ...createTextClip(0, 'a b c', 3), preset: 'highlight' as const };
    expect(activeWord(even, 2.5, 3)).toBe(2);
    expect(activeWord({ ...even, preset: 'classic' }, 2.5, 3)).toBe(-1);
  });
});
