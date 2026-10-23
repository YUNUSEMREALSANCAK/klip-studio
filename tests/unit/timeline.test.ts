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
  it('ana izdeki klipleri boşluksuz dizer', () => {
    const packed = packMainTrack([main('b', 20, 3), main('a', 5, 2)]);
    const byId = Object.fromEntries(packed.map((c) => [c.id, c.start]));
    expect(byId).toEqual({ a: 0, b: 2 });
  });

  it('ilk klibin geçişini kaldırır', () => {
    const packed = packMainTrack([main('a', 0, 2, { transition: { type: 'fade', duration: 0.5 } })]);
    expect((packed[0] as MediaClip).transition).toBeUndefined();
  });
});

describe('splitClip', () => {
  it('klibi böler ve sağ parçanın kaynak başlangıcını kaydırır', () => {
    const [left, right] = splitClip(main('a', 0, 10, { in: 2 }), 4)! as [MediaClip, MediaClip];
    expect(left.duration).toBe(4);
    expect(right.start).toBe(4);
    expect(right.in).toBe(6);
    expect(right.duration).toBe(6);
    expect(right.id).not.toBe(left.id);
  });

  it('kenara çok yakın bölmeyi reddeder', () => {
    expect(splitClip(main('a', 0, 10), 0.01)).toBeNull();
  });

  it('metin klibinin kelimelerini iki parçaya dağıtır', () => {
    const text: TextClip = {
      ...createTextClip(0, 'merhaba dünya', 2),
      words: [
        { text: 'merhaba', start: 0, end: 0.8 },
        { text: 'dünya', start: 1.2, end: 1.9 },
      ],
    };
    const [left, right] = splitClip(text, 1)! as [TextClip, TextClip];
    expect(left.text).toBe('merhaba');
    expect(right.text).toBe('dünya');
  });
});

describe('rippleDelete', () => {
  it('aralığı siler ve sonrasını sola kaydırır', () => {
    const clips: Clip[] = [main('a', 0, 10), { ...createTextClip(8, 'son', 1), id: 't' }];
    const result = rippleDelete(clips, 2, 4);
    const pieces = result.filter((c) => c.track === 'main') as MediaClip[];
    expect(pieces.map((c) => [c.start, c.duration, c.in])).toEqual([
      [0, 2, 0],
      [2, 6, 4],
    ]);
    expect(result.find((c) => c.id === 't')!.start).toBe(6);
  });

  it('birden fazla aralığı doğru sırayla siler', () => {
    const result = rippleDeleteRanges([main('a', 0, 10)], [
      [1, 2],
      [5, 6],
    ]);
    const total = result.reduce((sum, c) => sum + c.duration, 0);
    expect(total).toBeCloseTo(8);
  });
});

describe('mergeRanges', () => {
  it('çakışan aralıkları birleştirir', () => {
    expect(mergeRanges([[3, 5], [0, 1], [4, 6]])).toEqual([[0, 1], [3, 6]]);
  });
});

describe('transitionAt', () => {
  it('kesimin iki yanında geçiş ilerlemesini hesaplar', () => {
    const clips = packMainTrack([main('a', 0, 4), main('b', 4, 4, { transition: { type: 'fade', duration: 1 } })]);
    expect(transitionAt(clips, 3.4)).toBeNull();
    expect(transitionAt(clips, 4)!.progress).toBeCloseTo(0.5);
    expect(transitionAt(clips, 4.4)!.to.id).toBe('b');
  });
});

describe('sourceTime', () => {
  it('kaynak sınırlarına sıkıştırır', () => {
    const clip = main('a', 2, 3, { in: 1 });
    expect(sourceTime(clip, 3, 10)).toBe(2);
    expect(sourceTime(clip, 0, 10)).toBe(0);
    expect(sourceTime(clip, 50, 10)).toBeCloseTo(9.96);
  });
});

describe('buildCaptions', () => {
  it('duraklamada ve cümle sonunda yeni satıra geçer', () => {
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
  it('çakışan klipleri ayrı şeritlere koyar', () => {
    const a = { ...createTextClip(0, 'a', 3), id: 'a' };
    const b = { ...createTextClip(1, 'b', 3), id: 'b' };
    const c = { ...createTextClip(3, 'c', 1), id: 'c' };
    const { lanes, count } = assignLanes([a, b, c]);
    expect(count).toBe(2);
    expect([lanes.get('a'), lanes.get('b'), lanes.get('c')]).toEqual([0, 1, 0]);
  });
});
