import { describe, expect, it } from 'vitest';
import { fadeGain, setValue, toggleKeyframe, valueAt } from '../../src/core/animation';
import { createMediaClip, splitClip } from '../../src/core/timeline';
import type { Asset, MediaClip } from '../../src/core/types';
import { parseCube } from '../../src/media/lut';

const asset: Asset = { id: 'a', name: 'a', kind: 'video', file: new Blob(), url: '', duration: 20, width: 1920, height: 1080, hasAudio: true };
const clip = (patch: Partial<MediaClip> = {}): MediaClip => ({ ...createMediaClip(asset, 'main', 0), duration: 10, ...patch });

describe('keyframes', () => {
  it('returns the base value without keyframes', () => {
    expect(valueAt(clip(), 'scale', 3)).toBe(1);
  });

  it('eases between two keyframes', () => {
    const c = clip({
      keyframes: [
        { prop: 'x', time: 0, value: 0 },
        { prop: 'x', time: 2, value: 1 },
      ],
    });
    expect(valueAt(c, 'x', 0)).toBe(0);
    expect(valueAt(c, 'x', 1)).toBeCloseTo(0.5);
    expect(valueAt(c, 'x', 5)).toBe(1);
  });

  it('writes changes to the keyframe at the playhead when keyframes exist', () => {
    let c = clip();
    c = { ...c, ...toggleKeyframe(c, 'opacity', 0) } as MediaClip;
    c = { ...c, ...setValue(c, 'opacity', 0.2, 4) } as MediaClip;
    expect(c.keyframes.filter((k) => k.prop === 'opacity')).toHaveLength(2);
    expect(c.opacity).toBe(1);
    expect(valueAt(c, 'opacity', 4)).toBeCloseTo(0.2);
  });

  it('shifts keyframes on the right piece of a split', () => {
    const c = clip({ keyframes: [{ prop: 'scale', time: 6, value: 2 }] });
    const [, right] = splitClip(c, 4)! as [MediaClip, MediaClip];
    expect(right.keyframes[0].time).toBe(2);
  });
});

describe('speed', () => {
  it('a 2× clip advances its source start twice as fast when split', () => {
    const [, right] = splitClip(clip({ speed: 2, in: 1 }), 3)! as [MediaClip, MediaClip];
    expect(right.in).toBe(7);
  });
});

describe('fade', () => {
  it('ramps volume linearly at fade in and out', () => {
    const c = clip({ fadeIn: 2, fadeOut: 1 });
    expect(fadeGain(c, 1)).toBeCloseTo(0.5);
    expect(fadeGain(c, 5)).toBe(1);
    expect(fadeGain(c, 9.5)).toBeCloseTo(0.5);
  });
});

describe('.cube LUT', () => {
  it('converts 3D LUT data to bytes', () => {
    const lut = parseCube('LUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1', 'deneme.cube');
    expect(lut.size).toBe(2);
    expect(lut.name).toBe('deneme');
    expect([...atob(lut.data)].map((c) => c.charCodeAt(0)).slice(0, 6)).toEqual([0, 0, 0, 255, 0, 0]);
  });

  it('rejects incomplete data', () => {
    expect(() => parseCube('LUT_3D_SIZE 2\n0 0 0', 'x')).toThrow();
  });
});

describe('speed curves', () => {
  const curve = {
    name: 'test',
    points: [
      { u: 0, speed: 1 },
      { u: 1, speed: 3 },
    ],
  };

  it('average speed is the area under the curve', async () => {
    const { averageSpeed, curveArea } = await import('../../src/core/speed');
    expect(averageSpeed(curve)).toBeCloseTo(2);
    expect(curveArea(curve, 0.5)).toBeCloseTo(0.75);
  });

  it('source time advances by the integral of the curve', async () => {
    const { sourceOffset } = await import('../../src/core/speed');
    const c = clip({ speed: 2, duration: 5, speedCurve: curve });
    expect(sourceOffset(c, 0)).toBe(0);
    expect(sourceOffset(c, 2.5)).toBeCloseTo(3.75);
    expect(sourceOffset(c, 5)).toBeCloseTo(10);
  });

  it('pieces of a split curved clip share the source seamlessly', () => {
    const c = clip({ speed: 2, duration: 5, in: 0, speedCurve: curve });
    const [left, right] = splitClip(c, 2.5)! as [MediaClip, MediaClip];
    expect(left.speedCurve).toBeUndefined();
    expect(left.duration * left.speed).toBeCloseTo(3.75);
    expect(right.in).toBeCloseTo(3.75);
    expect(right.duration * right.speed).toBeCloseTo(6.25);
  });
});

describe('migration', () => {
  it('moves the old smoothSlowMo field to slowMotion and fills missing fields', async () => {
    const { normalizeProject } = await import('../../src/core/migrate');
    const old = { ...clip({ speed: 0.5 }), smoothSlowMo: true } as MediaClip & { smoothSlowMo: boolean };
    delete (old as Partial<MediaClip>).keyframes;
    const project = normalizeProject({ aspect: '16:9', fps: 30, background: '#000', clips: [old] } as never);
    const migrated = project.clips[0] as MediaClip;
    expect(migrated.slowMotion).toBe('blend');
    expect(migrated.keyframes).toEqual([]);
    expect(project.luts).toEqual({});
  });
});
