import { create } from 'zustand';
import { createMediaClip, createTextClip, packMainTrack, splitClip, trackEnd } from './timeline';
import { normalizeProject } from './migrate';
import type { AspectRatio, Asset, Clip, Project } from './types';

export interface Task {
  id: string;
  label: string;
  progress: number; // 0..1, -1 = indeterminate
  message?: string;
  error?: string;
}

interface EditorState {
  project: Project;
  assets: Record<string, Asset>;
  selectedId: string | null;
  time: number;
  playing: boolean;
  stopAt: number | null; // time at which preview playback stops
  zoom: number; // pixels per second
  past: Project[];
  future: Project[];
  tasks: Task[];

  checkpoint: () => void;
  mutate: (fn: (clips: Clip[]) => Clip[], record?: boolean) => void;
  updateClip: (id: string, patch: Partial<Clip>, record?: boolean) => void;
  addAsset: (asset: Asset) => void;
  loadProject: (project: Project, assets: Record<string, Asset>) => void;
  newProject: () => void;
  addAssetToTimeline: (assetId: string, track?: 'main' | 'overlay' | 'audio') => void;
  addText: (text?: string) => void;
  removeClip: (id: string) => void;
  splitAtPlayhead: () => void;
  select: (id: string | null) => void;
  setTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  previewRange: (start: number, end: number) => void;
  setZoom: (zoom: number) => void;
  setAspect: (aspect: AspectRatio) => void;
  setMarkers: (markers: number[]) => void;
  undo: () => void;
  redo: () => void;
  startTask: (label: string) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  endTask: (id: string) => void;
}

const HISTORY_LIMIT = 80;

export const emptyProject = (): Project => ({
  aspect: '16:9',
  fps: 30,
  background: '#000000',
  backgroundBlur: false,
  clips: [],
  markers: [],
  luts: {},
  effects: {},
  fonts: {},
});

export const useEditor = create<EditorState>((set, get) => ({
  project: emptyProject(),
  assets: {},
  selectedId: null,
  time: 0,
  playing: false,
  stopAt: null,
  zoom: 60,
  past: [],
  future: [],
  tasks: [],

  checkpoint: () => set((s) => ({ past: [...s.past.slice(-HISTORY_LIMIT), s.project], future: [] })),

  mutate: (fn, record = true) => {
    if (record) get().checkpoint();
    set((s) => ({ project: { ...s.project, clips: packMainTrack(fn(s.project.clips)) } }));
  },

  updateClip: (id, patch, record = true) => get().mutate((clips) => clips.map((c) => (c.id === id ? ({ ...c, ...patch } as Clip) : c)), record),

  addAsset: (asset) => set((s) => ({ assets: { ...s.assets, [asset.id]: asset } })),

  loadProject: (project, assets) => set({ project: normalizeProject(project), assets, selectedId: null, time: 0, playing: false, past: [], future: [] }),

  newProject: () => set({ project: emptyProject(), assets: {}, selectedId: null, time: 0, playing: false, past: [], future: [] }),

  addAssetToTimeline: (assetId, track) => {
    const asset = get().assets[assetId];
    if (!asset) return;
    const target = track ?? (asset.kind === 'audio' ? 'audio' : 'main');
    const start = target === 'main' ? trackEnd(get().project.clips, 'main') : get().time;
    const clip = createMediaClip(asset, target, start);
    get().mutate((clips) => [...clips, clip]);
    set({ selectedId: clip.id });
  },

  addText: (text) => {
    const clip = createTextClip(get().time, text);
    get().mutate((clips) => [...clips, clip]);
    set({ selectedId: clip.id });
  },

  removeClip: (id) => {
    get().mutate((clips) => clips.filter((c) => c.id !== id));
    set({ selectedId: null });
  },

  splitAtPlayhead: () => {
    const { time, selectedId, project } = get();
    // Splits only the selected clip if it's under the playhead, otherwise every clip under it.
    const underPlayhead = project.clips.filter((c) => time > c.start && time < c.start + c.duration);
    const selected = underPlayhead.filter((c) => c.id === selectedId);
    const targets = selected.length ? selected : underPlayhead;
    if (!targets.length) return;
    get().mutate((clips) =>
      clips.flatMap((c) => {
        if (!targets.includes(c)) return [c];
        return splitClip(c, time) ?? [c];
      }),
    );
  },

  select: (id) => set({ selectedId: id }),
  setTime: (time) => set({ time: Math.max(0, time) }),
  setPlaying: (playing) => set({ playing, stopAt: null }),
  previewRange: (start, end) => set({ time: Math.max(0, start), playing: true, stopAt: end }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 8), 400) }),

  setAspect: (aspect) => {
    get().checkpoint();
    set((s) => ({ project: { ...s.project, aspect } }));
  },

  setMarkers: (markers) => set((s) => ({ project: { ...s.project, markers } })),

  undo: () => {
    const { past, project, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    set({ project: previous, past: past.slice(0, -1), future: [project, ...future] });
  },

  redo: () => {
    const { past, project, future } = get();
    const next = future[0];
    if (!next) return;
    set({ project: next, past: [...past, project], future: future.slice(1) });
  },

  startTask: (label) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ tasks: [...s.tasks, { id, label, progress: -1 }] }));
    return id;
  },

  updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  endTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));

export const selectedClip = (s: EditorState) => s.project.clips.find((c) => c.id === s.selectedId) ?? null;
