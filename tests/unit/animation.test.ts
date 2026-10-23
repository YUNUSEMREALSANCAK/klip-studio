import { describe, expect, it } from 'vitest';
import { fadeGain, setValue, toggleKeyframe, valueAt } from '../../src/core/animation';
import { createMediaClip, splitClip } from '../../src/core/timeline';
import type { Asset, MediaClip } from '../../src/core/types';
import { parseCube } from '../../src/media/lut';

const asset: Asset = { id: 'a', name: 'a', kind: 'video', file: new Blob(), url: '', duration: 20, width: 1920, height: 1080, hasAudio: true };
const clip = (patch: Partial<MediaClip> = {}): MediaClip => ({ ...createMediaClip(asset, 'main', 0), duration: 10, ...patch });

describe('anahtar kareler', () => {
  it('anahtar kare yoksa temel değeri döndürür', () => {
    expect(valueAt(clip(), 'scale', 3)).toBe(1);
  });

  it('iki kare arasında yumuşak geçiş yapar', () => {
    const c = clip({ keyframes: [{ prop: 'x', time: 0, value: 0 }, { prop: 'x', time: 2, value: 1 }] });
    expect(valueAt(c, 'x', 0)).toBe(0);
    expect(valueAt(c, 'x', 1)).toBeCloseTo(0.5);
    expect(valueAt(c, 'x', 5)).toBe(1);
  });

  it('anahtar kare varsa değişiklik o anki kareye yazılır', () => {
    let c = clip();
    c = { ...c, ...toggleKeyframe(c, 'opacity', 0) } as MediaClip;
    c = { ...c, ...setValue(c, 'opacity', 0.2, 4) } as MediaClip;
    expect(c.keyframes.filter((k) => k.prop === 'opacity')).toHaveLength(2);
    expect(c.opacity).toBe(1);
    expect(valueAt(c, 'opacity', 4)).toBeCloseTo(0.2);
  });

  it('bölünen klibin sağ parçasında anahtar kareler kayar', () => {
    const c = clip({ keyframes: [{ prop: 'scale', time: 6, value: 2 }] });
    const [, right] = splitClip(c, 4)! as [MediaClip, MediaClip];
    expect(right.keyframes[0].time).toBe(2);
  });
});

describe('hız', () => {
  it('2× hızda bölünen klibin kaynak başlangıcı iki kat ilerler', () => {
    const [, right] = splitClip(clip({ speed: 2, in: 1 }), 3)! as [MediaClip, MediaClip];
    expect(right.in).toBe(7);
  });
});

describe('fade', () => {
  it('giriş ve çıkışta ses düzeyini doğrusal değiştirir', () => {
    const c = clip({ fadeIn: 2, fadeOut: 1 });
    expect(fadeGain(c, 1)).toBeCloseTo(0.5);
    expect(fadeGain(c, 5)).toBe(1);
    expect(fadeGain(c, 9.5)).toBeCloseTo(0.5);
  });
});

describe('.cube LUT', () => {
  it('3D LUT verisini bayta çevirir', () => {
    const lut = parseCube('LUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1', 'deneme.cube');
    expect(lut.size).toBe(2);
    expect(lut.name).toBe('deneme');
    expect([...atob(lut.data)].map((c) => c.charCodeAt(0)).slice(0, 6)).toEqual([0, 0, 0, 255, 0, 0]);
  });

  it('eksik veriyi reddeder', () => {
    expect(() => parseCube('LUT_3D_SIZE 2\n0 0 0', 'x')).toThrow();
  });
});
