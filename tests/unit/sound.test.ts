import { describe, expect, it } from 'vitest';
import { planAutoSfx } from '../../src/media/autoSfx';
import { integratedLoudness, normalizeLoudness } from '../../src/media/loudness';
import type { LibrarySound } from '../../src/media/soundEffects';
import { createTextClip } from '../../src/core/timeline';
import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type MediaClip } from '../../src/core/types';

const RATE = 48000;
const sine = (seconds: number, dbfs: number, frequency = 997) =>
  Float32Array.from({ length: seconds * RATE }, (_, i) => Math.pow(10, dbfs / 20) * Math.sin((2 * Math.PI * frequency * i) / RATE));

describe('loudness', () => {
  it('measures a 997 Hz sine like the BS.1770 reference', () => {
    // A full-scale sine on one channel reads -3.01 LUFS; on two channels, 0 LUFS.
    expect(integratedLoudness([sine(3, -20)], RATE)).toBeCloseTo(-23.01, 1);
    expect(integratedLoudness([sine(3, -20), sine(3, -20)], RATE)).toBeCloseTo(-20, 1);
  });

  it('gates out silence', () => {
    const half = new Float32Array(6 * RATE);
    half.set(sine(3, -20));
    expect(integratedLoudness([half, half], RATE)).toBeCloseTo(-20, 0);
    expect(integratedLoudness([new Float32Array(RATE)], RATE)).toBe(-Infinity);
  });

  it('normalizes to -14 LUFS and keeps peaks under the ceiling', () => {
    const left = sine(4, -30);
    const right = sine(4, -30);
    left[RATE] = right[RATE] = 0.9; // a spike that would clip after the gain
    normalizeLoudness([left, right], RATE);
    expect(integratedLoudness([left, right], RATE)).toBeCloseTo(-14, 0);
    const peak = [left, right].reduce((max, data) => data.reduce((m, x) => Math.max(m, Math.abs(x)), max), 0);
    expect(peak).toBeLessThanOrEqual(Math.pow(10, -1.5 / 20) + 1e-6);
  });
});

const sound = (id: string, duration: number): LibrarySound => ({
  id,
  name: id,
  category: id.split('/')[0],
  file: `${id}.mp3`,
  duration,
  author: '',
  url: '',
  license: 'CC0 1.0',
});

const mainClip = (id: string, start: number, duration: number): MediaClip => ({
  id,
  type: 'media',
  track: 'main',
  assetId: 'a',
  start,
  in: 0,
  duration,
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
});

describe('automatic sound effects', () => {
  const library = [sound('whoosh/a', 0.6), sound('whoosh/b', 0.9), sound('whoosh/long', 6), sound('pop/p', 0.2), sound('impact/x', 1)];

  it('puts a whoosh before every cut and a tick on texts, never two at once', () => {
    const clips = [
      mainClip('m1', 0, 3),
      mainClip('m2', 3, 3),
      mainClip('m3', 6, 3),
      { ...createTextClip(3.1, 'Hi'), id: 't1' },
      { ...createTextClip(7.5, 'Yo'), id: 't2' },
    ];
    const plan = planAutoSfx(clips, library);
    expect(plan.map((p) => p.reason)).toEqual(['cut', 'cut', 'text']);
    expect(plan[0].start).toBeCloseTo(3 - 0.24, 2); // 0.6 s whoosh: lead is 40% of it
    expect(plan.every((p) => p.sound !== 'whoosh/long')).toBe(true);
    expect(new Set(plan.filter((p) => p.reason === 'cut').map((p) => p.sound)).size).toBe(2); // rotated
    expect(plan[2]).toMatchObject({ sound: 'pop/p', start: 7.5 });
  });
});
