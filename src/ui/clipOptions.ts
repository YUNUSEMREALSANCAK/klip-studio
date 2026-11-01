import { tr } from '../i18n';
import { FULL_CROP, type BlendMode, type Crop, type CustomEffect } from '../core/types';
import { EFFECT_LIBRARY, isLibraryId, libraryEffect, libraryId } from '../render/effectLibrary';
import { TRANSITION_TYPES } from '../render/shaders';

// Option lists and helpers shared by the inspector and the applied effects panel.

export const percent = (v: number) => `${Math.round(v * 100)}%`;
export const seconds = (v: number) => `${v.toFixed(1)} s`;

export const BLEND_MODES: [BlendMode, string][] = [
  ['normal', 'Normal'],
  ['multiply', 'Multiply'],
  ['screen', 'Screen'],
  ['add', 'Add'],
  ['lighten', 'Lighten'],
  ['darken', 'Darken'],
];

export type CropSides = { left: number; right: number; top: number; bottom: number };
export const CROP_SIDES: [keyof CropSides, string][] = [
  ['left', 'Left'],
  ['right', 'Right'],
  ['top', 'Top'],
  ['bottom', 'Bottom'],
];
export const cropSides = (crop: Crop = FULL_CROP): CropSides => ({
  left: crop.x,
  right: 1 - crop.x - crop.width,
  top: crop.y,
  bottom: 1 - crop.y - crop.height,
});
export const cropFromSides = ({ left, right, top, bottom }: CropSides): Crop | undefined =>
  left + right + top + bottom === 0 ? undefined : { x: left, y: top, width: 1 - left - right, height: 1 - top - bottom };

// Built-in library effects first, then the project's own custom ones.
export const effectOptions = (effects: Record<string, CustomEffect>, kind: CustomEffect['kind']) => [
  ...EFFECT_LIBRARY.filter((e) => e.kind === kind).map((e) => ({ id: libraryId(e), name: tr(e.name) })),
  ...Object.values(effects).filter((e) => e.kind === kind && !isLibraryId(e.id)),
];

export const effectName = (effects: Record<string, CustomEffect>, id: string) => {
  const builtIn = libraryEffect(id);
  return builtIn ? tr(builtIn.name) : (effects[id]?.name ?? id);
};

export const transitionLabel = (type: string) => tr(TRANSITION_TYPES.find((t) => t.type === type)?.label ?? type);
