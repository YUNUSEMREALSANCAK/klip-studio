import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type Asset, type Clip, type MediaClip, type TextClip, type TrackId, type Word } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clipEnd = (clip: Clip) => clip.start + clip.duration;

// Klibin kaynakta kapladığı süre (hız 2× ise zaman çizelgesindeki sürenin iki katı).
export const sourceSpan = (clip: MediaClip) => clip.duration * clip.speed;

// Bölünen klibin sağ parçası için anahtar kareleri sola kaydırır.
const shiftKeyframes = (clip: MediaClip, offset: number) =>
  clip.keyframes.length ? clip.keyframes.map((k) => ({ ...k, time: k.time - offset })) : clip.keyframes;

export const projectDuration = (clips: Clip[]) => clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);

export const trackEnd = (clips: Clip[], track: TrackId) =>
  clips.filter((c) => c.track === track).reduce((max, c) => Math.max(max, clipEnd(c)), 0);

export const isActiveAt = (clip: Clip, t: number) => t >= clip.start && t < clipEnd(clip);

export const sortedTrack = <T extends Clip>(clips: Clip[], track: TrackId) =>
  clips.filter((c) => c.track === track).sort((a, b) => a.start - b.start) as T[];

// Ana iz "manyetiktir": klipler arada boşluk kalmadan art arda dizilir.
export function packMainTrack(clips: Clip[]): Clip[] {
  const main = sortedTrack<MediaClip>(clips, 'main');
  let cursor = 0;
  const packed = new Map<string, number>();
  for (const clip of main) {
    packed.set(clip.id, cursor);
    cursor += clip.duration;
  }
  return clips.map((c) => {
    if (!packed.has(c.id)) return c;
    const start = packed.get(c.id)!;
    // İlk klibin geçişi olamaz; geçiş süresi iki klibin de yarısını aşamaz.
    const media = c as MediaClip;
    const index = main.findIndex((m) => m.id === c.id);
    const transition = index === 0 ? undefined : media.transition;
    return { ...media, start, transition };
  });
}

// Üst üste binen klipleri ayrı şeritlere yerleştirir (ilk boş şerit). Ana iz hep tek şerittir.
export function assignLanes(clips: Clip[]): { lanes: Map<string, number>; count: number } {
  const ends: number[] = [];
  const lanes = new Map<string, number>();
  for (const clip of [...clips].sort((a, b) => a.start - b.start)) {
    let lane = ends.findIndex((end) => end <= clip.start + 1e-3);
    if (lane < 0) lane = ends.length;
    ends[lane] = clipEnd(clip);
    lanes.set(clip.id, lane);
  }
  return { lanes, count: Math.max(1, ends.length) };
}

export function createMediaClip(asset: Asset, track: MediaClip['track'], start: number): MediaClip {
  return {
    id: uid(),
    type: 'media',
    track,
    assetId: asset.id,
    start,
    in: 0,
    duration: asset.kind === 'image' ? 4 : asset.duration,
    volume: 1,
    muted: false,
    filter: { ...DEFAULT_FILTER },
    removeBackground: false,
    transform: { ...DEFAULT_TRANSFORM, scale: track === 'overlay' ? 0.4 : 1 },
    speed: 1,
    opacity: 1,
    keyframes: [],
    fadeIn: 0,
    fadeOut: 0,
    duck: false,
    smoothSlowMo: false,
  };
}

export function createTextClip(start: number, text = 'Yeni metin', duration = 3): TextClip {
  return {
    id: uid(),
    type: 'text',
    track: 'text',
    start,
    duration,
    text,
    preset: 'classic',
    animation: 'pop',
    color: '#ffffff',
    highlight: '#ffd400',
    fontSize: 0.065,
    y: 0.8,
  };
}

// Klibi t anında ikiye böler. t klibin içinde değilse null döner.
export function splitClip(clip: Clip, t: number): [Clip, Clip] | null {
  const offset = t - clip.start;
  if (offset <= 0.05 || offset >= clip.duration - 0.05) return null;
  const left = { ...clip, duration: offset } as Clip;
  const right = { ...clip, id: uid(), start: t, duration: clip.duration - offset } as Clip;
  if (right.type === 'media') {
    const media = clip as MediaClip;
    right.in = media.in + offset * media.speed;
    right.transition = undefined;
    right.keyframes = shiftKeyframes(media, offset);
    right.fadeIn = 0;
    (left as MediaClip).fadeOut = 0;
  }
  if (clip.type === 'text' && clip.words) {
    (left as TextClip).words = clip.words.filter((w) => w.start < t);
    (right as TextClip).words = clip.words.filter((w) => w.start >= t);
    syncTextFromWords(left as TextClip);
    syncTextFromWords(right as TextClip);
  }
  return [left, right];
}

function syncTextFromWords(clip: TextClip) {
  if (clip.words) clip.text = clip.words.map((w) => w.text).join(' ');
}

function shiftClip(clip: Clip, delta: number): Clip {
  if (clip.type === 'text' && clip.words) {
    return {
      ...clip,
      start: clip.start + delta,
      words: clip.words.map((w) => ({ ...w, start: w.start + delta, end: w.end + delta })),
    };
  }
  return { ...clip, start: clip.start + delta };
}

// [start, end) aralığını tüm izlerden siler ve sonrasını sola kaydırır.
export function rippleDelete(clips: Clip[], start: number, end: number): Clip[] {
  const gap = end - start;
  const result: Clip[] = [];
  for (const clip of clips) {
    const s = clip.start;
    const e = clipEnd(clip);
    if (e <= start) {
      result.push(clip);
    } else if (s >= end) {
      result.push(shiftClip(clip, -gap));
    } else {
      if (s < start) {
        const left = { ...clip, duration: start - s } as Clip;
        if (left.type === 'text' && left.words) {
          left.words = left.words.filter((w) => w.end <= start + 0.01);
          syncTextFromWords(left);
        }
        result.push(left);
      }
      if (e > end) {
        let right = { ...clip, id: s < start ? uid() : clip.id, start: end, duration: e - end } as Clip;
        if (right.type === 'media') {
          const media = clip as MediaClip;
          right.in = media.in + (end - s) * media.speed;
          right.keyframes = shiftKeyframes(media, end - s);
          if (s < start) right.transition = undefined;
        }
        if (right.type === 'text' && right.words) {
          right.words = right.words.filter((w) => w.start >= end - 0.01);
          syncTextFromWords(right);
        }
        right = shiftClip(right, -gap);
        result.push(right);
      }
    }
  }
  return packMainTrack(result.filter((c) => c.duration > 0.04 && !(c.type === 'text' && c.text.trim() === '')));
}

// Birden fazla aralığı sondan başa doğru siler (kaymalar birbirini bozmasın diye).
export function rippleDeleteRanges(clips: Clip[], ranges: [number, number][]): Clip[] {
  return mergeRanges(ranges)
    .sort((a, b) => b[0] - a[0])
    .reduce((acc, [s, e]) => rippleDelete(acc, s, e), clips);
}

export function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

export interface TransitionState {
  from: MediaClip;
  to: MediaClip;
  progress: number; // 0..1
}

// Ana izde t anında bir geçiş oynuyorsa iki klibi ve ilerlemeyi döndürür.
export function transitionAt(clips: Clip[], t: number): TransitionState | null {
  const main = sortedTrack<MediaClip>(clips, 'main');
  for (let i = 1; i < main.length; i++) {
    const to = main[i];
    if (!to.transition) continue;
    const half = to.transition.duration / 2;
    if (t >= to.start - half && t < to.start + half) {
      return { from: main[i - 1], to, progress: (t - (to.start - half)) / to.transition.duration };
    }
  }
  return null;
}

// Klibin kaynak zamanı; geçiş taşmalarında kaynak sınırlarına sıkıştırılır.
export function sourceTime(clip: MediaClip, t: number, assetDuration: number) {
  const time = clip.in + (t - clip.start) * clip.speed;
  return Math.min(Math.max(time, 0), Math.max(assetDuration - 0.04, 0));
}

// Kelimeleri okunabilir altyazı satırlarına böler.
export function buildCaptions(words: Word[], maxWords = 6, maxDuration = 2.8): TextClip[] {
  const groups: Word[][] = [];
  let current: Word[] = [];
  for (const word of words) {
    const first = current[0];
    const previous = current[current.length - 1];
    const tooLong = first && word.end - first.start > maxDuration;
    const pause = previous && word.start - previous.end > 0.6;
    if (current.length >= maxWords || tooLong || pause) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    if (/[.!?]$/.test(word.text)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);

  return groups.map((group) => {
    const start = group[0].start;
    const end = group[group.length - 1].end;
    return {
      ...createTextClip(start, group.map((w) => w.text).join(' '), Math.max(end - start, 0.3)),
      preset: 'karaoke',
      animation: 'none',
      fontSize: 0.055,
      words: group,
    };
  });
}

export function formatTime(seconds: number) {
  const s = Math.max(seconds, 0);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
