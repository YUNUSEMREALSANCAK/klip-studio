import { DEFAULT_FILTER, type FilterSettings } from '../core/types';

export const FILTER_PRESETS: { name: string; filter: FilterSettings; swatch: string }[] = [
  { name: 'Original', filter: DEFAULT_FILTER, swatch: 'linear-gradient(135deg,#6b7280,#d1d5db)' },
  { name: 'Vivid', filter: { ...DEFAULT_FILTER, saturation: 0.45, contrast: 0.15 }, swatch: 'linear-gradient(135deg,#f43f5e,#facc15)' },
  {
    name: 'Cinematic',
    filter: { ...DEFAULT_FILTER, contrast: 0.25, saturation: -0.15, temperature: -0.3, vignette: 0.5 },
    swatch: 'linear-gradient(135deg,#0f766e,#f59e0b)',
  },
  { name: 'Warm', filter: { ...DEFAULT_FILTER, temperature: 0.6, saturation: 0.1 }, swatch: 'linear-gradient(135deg,#f97316,#fde68a)' },
  { name: 'Cool', filter: { ...DEFAULT_FILTER, temperature: -0.6, brightness: 0.05 }, swatch: 'linear-gradient(135deg,#1d4ed8,#a5f3fc)' },
  {
    name: 'Vintage',
    filter: { ...DEFAULT_FILTER, contrast: -0.15, saturation: -0.35, temperature: 0.4, vignette: 0.6 },
    swatch: 'linear-gradient(135deg,#78350f,#fcd34d)',
  },
  { name: 'Black & white', filter: { ...DEFAULT_FILTER, grayscale: true, contrast: 0.2 }, swatch: 'linear-gradient(135deg,#111,#eee)' },
  { name: 'Faded', filter: { ...DEFAULT_FILTER, contrast: -0.3, brightness: 0.1, saturation: -0.2 }, swatch: 'linear-gradient(135deg,#a8a29e,#f5f5f4)' },
  { name: 'Crisp', filter: { ...DEFAULT_FILTER, sharpen: 0.6, contrast: 0.1 }, swatch: 'linear-gradient(135deg,#334155,#e2e8f0)' },
];
