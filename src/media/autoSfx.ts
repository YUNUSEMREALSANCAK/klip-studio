import { sortedTrack } from '../core/timeline';
import type { Clip, MediaClip, TextClip } from '../core/types';
import type { LibrarySound } from './soundEffects';

// Automatic sound design: a soft whoosh on every cut of the main track and a quiet tick when a text appears.
// Lessons from real edits: rotate the recordings (the same whoosh over and over sounds cheap),
// keep effects well under the voice (they are ducked) and never stack two sounds on one moment.

export interface SfxPlacement {
  sound: string; // library id
  start: number;
  volume: number;
  reason: 'cut' | 'text';
}

export interface AutoSfxOptions {
  cuts?: boolean;
  texts?: boolean;
  volume?: number; // 0..2, scales every placement
}

const WHOOSH_LEAD = 0.25; // s before the cut: a whoosh peaks near its middle
const MIN_GAP = 0.45; // s between two placed sounds
const TEXT_SOUNDS = new Set(['pop', 'ui']);

// Short, usable recordings of a category, longest last so the rotation starts with the snappiest.
const pick = (library: LibrarySound[], match: (s: LibrarySound) => boolean, maxDuration: number) =>
  library.filter((s) => match(s) && s.duration >= 0.15 && s.duration <= maxDuration).sort((a, b) => a.duration - b.duration);

export function planAutoSfx(clips: Clip[], library: LibrarySound[], options: AutoSfxOptions = {}): SfxPlacement[] {
  const { cuts = true, texts = true, volume = 1 } = options;
  const general = library.filter((s) => !s.pack); // packs are a video's own mix; rotate the plain library
  const whooshes = pick(general, (s) => s.category === 'whoosh', 1.6);
  const ticks = pick(general, (s) => TEXT_SOUNDS.has(s.category), 0.8);
  const placements: SfxPlacement[] = [];

  if (cuts && whooshes.length) {
    const main = sortedTrack<MediaClip>(clips, 'main');
    main.slice(1).forEach((clip, i) => {
      const sound = whooshes[(i * 7) % whooshes.length];
      const lead = Math.min(WHOOSH_LEAD, sound.duration * 0.4);
      placements.push({ sound: sound.id, start: Math.max(0, clip.start - lead), volume: 0.7 * volume, reason: 'cut' });
    });
  }

  if (texts && ticks.length) {
    sortedTrack<TextClip>(clips, 'text').forEach((clip, i) => {
      const sound = ticks[(i * 5) % ticks.length];
      placements.push({ sound: sound.id, start: clip.start, volume: 0.45 * volume, reason: 'text' });
    });
  }

  // Cuts win over texts when two would land on the same moment.
  const kept: SfxPlacement[] = [];
  for (const p of placements.sort((a, b) => (a.reason === b.reason ? a.start - b.start : a.reason === 'cut' ? -1 : 1))) {
    if (kept.every((k) => Math.abs(k.start - p.start) >= MIN_GAP)) kept.push(p);
  }
  return kept.sort((a, b) => a.start - b.start);
}
