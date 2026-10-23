import { describe, expect, it } from 'vitest';
import {
  assignLanes,
  buildCaptions,
  createMediaClip,
  createTextClip,
  mergeRanges,
  packMainTrack,
  rippleDelete,
  rippleDeleteRanges,
  sourceTime,
  splitClip,
  transitionAt,
} from '../../src/core/timeline';
import type { Asset, Clip, MediaClip, TextClip } from '../../src/core/types';

const asset = (id: string, duration = 10): Asset => ({
  id,
  name: id,
  kind: 'video',
  file: new Blob(),
  url: '',
  duration,
  width: 1920,
  height: 1080,
  hasAudio: true,
});

const main = (id: string, start: number, duration: number, extra: Partial<MediaClip> = {}): MediaClip => ({
  ...createMediaClip(asset(id), 'main', start),
  id,
  duration,
  ...extra,
});

describe('packMainTrack', () => {
  it('packs main-track clips without gaps', () => {
    const packed = packMainTrack([main('b', 20, 3), main('a', 5, 2)]);
    const byId = Object.fromEntries(packed.map((c) => [c.id, c.start]));
    expect(byId).toEqual({ a: 0, b: 2 });
  });

  it('removes the transition of the first clip', () => {
    const packed = packMainTrack([main('a', 0, 2, { transition: { type: 'fade', duration: 0.5 } })]);
    expect((packed[0] as MediaClip).transition).toBeUndefined();
  });
});

describe('splitClip', () => {
  it('splits a clip and moves the right piece source start', () => {
    const [left, right] = splitClip(main('a', 0, 10, { in: 2 }), 4)! as [MediaClip, MediaClip];
    expect(left.duration).toBe(4);
    expect(right.start).toBe(4);
    expect(right.in).toBe(6);
    expect(right.duration).toBe(6);
    expect(right.id).not.toBe(left.id);
  });

  it('rejects a split too close to the edge', () => {
    expect(splitClip(main('a', 0, 10), 0.01)).toBeNull();
  });

  it('distributes text clip words across both pieces', () => {
    const text: TextClip = {
      ...createTextClip(0, 'hello world', 2),
      words: [
        { text: 'hello', start: 0, end: 0.8 },
        { text: 'world', start: 1.2, end: 1.9 },
      ],
    };
    const [left, right] = splitClip(text, 1)! as [TextClip, TextClip];
    expect(left.text).toBe('hello');
    expect(right.text).toBe('world');
  });
});

describe('rippleDelete', () => {
  it('deletes the range and shifts later clips left', () => {
    const clips: Clip[] = [main('a', 0, 10), { ...createTextClip(8, 'son', 1), id: 't' }];
    const result = rippleDelete(clips, 2, 4);
    const pieces = result.filter((c) => c.track === 'main') as MediaClip[];
    expect(pieces.map((c) => [c.start, c.duration, c.in])).toEqual([
      [0, 2, 0],
      [2, 6, 4],
    ]);
    expect(result.find((c) => c.id === 't')!.start).toBe(6);
  });

  it('deletes several ranges in the right order', () => {
    const result = rippleDeleteRanges(
      [main('a', 0, 10)],
      [
        [1, 2],
        [5, 6],
      ],
    );
    const total = result.reduce((sum, c) => sum + c.duration, 0);
    expect(total).toBeCloseTo(8);
  });
});

describe('mergeRanges', () => {
  it('merges overlapping ranges', () => {
    expect(
      mergeRanges([
        [3, 5],
        [0, 1],
        [4, 6],
      ]),
    ).toEqual([
      [0, 1],
      [3, 6],
    ]);
  });
});

describe('transitionAt', () => {
  it('computes transition progress around the cut', () => {
    const clips = packMainTrack([main('a', 0, 4), main('b', 4, 4, { transition: { type: 'fade', duration: 1 } })]);
    expect(transitionAt(clips, 3.4)).toBeNull();
    expect(transitionAt(clips, 4)!.progress).toBeCloseTo(0.5);
    expect(transitionAt(clips, 4.4)!.to.id).toBe('b');
  });
});

describe('sourceTime', () => {
  it('clamps to the source bounds', () => {
    const clip = main('a', 2, 3, { in: 1 });
    expect(sourceTime(clip, 3, 10)).toBe(2);
    expect(sourceTime(clip, 0, 10)).toBe(0);
    expect(sourceTime(clip, 50, 10)).toBeCloseTo(9.96);
  });
});

describe('buildCaptions', () => {
  it('breaks lines on pauses and sentence ends', () => {
    const captions = buildCaptions([
      { text: 'Merhaba.', start: 0, end: 0.5 },
      { text: 'Bu', start: 0.6, end: 0.8 },
      { text: 'bir', start: 0.8, end: 1 },
      { text: 'test', start: 2.5, end: 3 },
    ]);
    expect(captions.map((c) => c.text)).toEqual(['Merhaba.', 'Bu bir', 'test']);
    expect(captions[0].preset).toBe('karaoke');
  });
});

describe('assignLanes', () => {
  it('puts overlapping clips on separate lanes', () => {
    const a = { ...createTextClip(0, 'a', 3), id: 'a' };
    const b = { ...createTextClip(1, 'b', 3), id: 'b' };
    const c = { ...createTextClip(3, 'c', 1), id: 'c' };
    const { lanes, count } = assignLanes([a, b, c]);
    expect(count).toBe(2);
    expect([lanes.get('a'), lanes.get('b'), lanes.get('c')]).toEqual([0, 1, 0]);
  });
});
