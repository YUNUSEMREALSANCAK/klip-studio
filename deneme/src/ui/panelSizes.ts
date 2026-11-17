import { create } from 'zustand';

// Sizes of the left panel, the applied effects panel, the right panel and the timeline (pixels);
// the stage takes what's left.

export type Panel = 'side' | 'applied' | 'inspector' | 'timeline';
type Sizes = Record<Panel, number>;

const STORAGE_KEY = 'klip-panels';
const COLLAPSED_KEY = 'klip-applied-collapsed';
export const DEFAULT_SIZES: Sizes = { side: 300, applied: 270, inspector: 290, timeline: 280 };
export const COLLAPSED_WIDTH = 36;
const MIN_STAGE = { width: 360, height: 200 };
const LIMITS: Record<Panel, [number, number]> = { side: [220, 560], applied: [220, 480], inspector: [240, 560], timeline: [150, 640] };

function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the layout lasts for this session only.
  }
}

// Keeps each panel within its limits and leaves the stage enough room in the current window.
function clamp(panel: Panel, value: number, sizes: Sizes) {
  const [min, max] = LIMITS[panel];
  const columns = (['side', 'applied', 'inspector'] as const).filter((p) => p !== panel).reduce((sum, p) => sum + sizes[p], 0);
  const room = panel === 'timeline' ? window.innerHeight - 44 - MIN_STAGE.height : window.innerWidth - MIN_STAGE.width - columns;
  return Math.round(Math.max(min, Math.min(max, room, value)));
}

interface PanelState {
  sizes: Sizes;
  appliedCollapsed: boolean;
  resize: (panel: Panel, value: number) => void;
  reset: (panel: Panel) => void;
  setAppliedCollapsed: (collapsed: boolean) => void;
}

export const usePanels = create<PanelState>((set, get) => ({
  sizes: { ...DEFAULT_SIZES, ...read<Partial<Sizes>>(STORAGE_KEY, {}) },
  appliedCollapsed: read(COLLAPSED_KEY, false),
  resize: (panel, value) => {
    const sizes = { ...get().sizes, [panel]: clamp(panel, value, get().sizes) };
    set({ sizes });
    write(STORAGE_KEY, sizes);
  },
  reset: (panel) => get().resize(panel, DEFAULT_SIZES[panel]),
  setAppliedCollapsed: (appliedCollapsed) => {
    set({ appliedCollapsed });
    write(COLLAPSED_KEY, appliedCollapsed);
  },
}));
