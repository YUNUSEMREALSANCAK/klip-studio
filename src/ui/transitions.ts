import { selectedClip, useEditor } from '../core/store';
import { sortedTrack } from '../core/timeline';
import type { MediaClip, TransitionType } from '../core/types';

export interface Cut {
  from: MediaClip;
  to: MediaClip;
  index: number; // kaçıncı kesim (1'den başlar)
}

const DEFAULT_DURATION = 0.8;

export const maxTransitionDuration = (cut: Cut) => Math.max(0.2, Math.min(2, cut.from.duration, cut.to.duration));

// Geçişin uygulanacağı kesim: seçili ana klibin sonu (son klipse başı); seçim yoksa oynatma çizgisine en yakın kesim.
export function targetCut(): Cut | null {
  const s = useEditor.getState();
  const main = sortedTrack<MediaClip>(s.project.clips, 'main');
  if (main.length < 2) return null;
  const cutAt = (i: number): Cut => ({ from: main[i - 1], to: main[i], index: i });

  const selected = selectedClip(s);
  const i = selected ? main.findIndex((c) => c.id === selected.id) : -1;
  if (i >= 0) return i < main.length - 1 ? cutAt(i + 1) : cutAt(i);

  let best = 1;
  for (let k = 2; k < main.length; k++) {
    if (Math.abs(main[k].start - s.time) < Math.abs(main[best].start - s.time)) best = k;
  }
  return cutAt(best);
}

// Geçişi uygular ve kesim çevresini kısaca oynatarak gösterir.
export function applyTransition(cut: Cut, type: TransitionType | null, duration?: number) {
  const s = useEditor.getState();
  const length = Math.min(duration ?? cut.to.transition?.duration ?? DEFAULT_DURATION, maxTransitionDuration(cut));
  s.updateClip(cut.to.id, { transition: type ? { type, duration: length } : undefined } as Partial<MediaClip>);
  if (type) s.previewRange(cut.to.start - length / 2 - 0.6, cut.to.start + length / 2 + 0.6);
}
