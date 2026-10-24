import { useEditor } from '../core/store';
import { uid } from '../core/timeline';
import type { Clip, CustomEffect, Project } from '../core/types';
import { libraryEffect, libraryId } from '../render/effectLibrary';
import { validateEffect } from '../render/effects';
import { checkGoogleFont, FONTS, registerFontFile } from '../render/fonts';

// Custom transitions, filters and fonts live in the project, so they're saved, undoable and travel with .klip files.

const editor = () => useEditor.getState();

function setProject(patch: (project: Project) => Partial<Project>) {
  editor().checkpoint();
  useEditor.setState((s) => ({ project: { ...s.project, ...patch(s.project) } }));
}

// Validates and stores an effect; with an id it replaces that effect. Throws the GLSL error log if it doesn't compile.
export function saveEffect({ id, kind, name, code }: { id?: string; kind: CustomEffect['kind']; name: string; code: string }): string {
  const existing = id ? editor().project.effects[id] : undefined;
  if (id && !existing) throw new Error(`Effect not found: ${id}`);
  if (existing && existing.kind !== kind) throw new Error(`${id} is a ${existing.kind}, not a ${kind}`);
  const error = validateEffect({ kind, code });
  if (error) throw new Error(`GLSL error:\n${error}`);
  const effect: CustomEffect = { id: id ?? `fx_${uid()}`, kind, name: name.trim() || (kind === 'transition' ? 'Custom transition' : 'Custom filter'), code };
  setProject((p) => ({ effects: { ...p.effects, [effect.id]: effect } }));
  return effect.id;
}

// Removes the effect and every use of it: transitions fall back to their built-in type, filters to none.
export function deleteEffect(id: string) {
  if (!editor().project.effects[id]) throw new Error(`Effect not found: ${id}`);
  const strip = (clip: Clip): Clip => {
    if (clip.type !== 'media') return clip;
    let next = clip;
    if (clip.transition?.effectId === id) next = { ...next, transition: { type: clip.transition.type, duration: clip.transition.duration } };
    if (clip.filter.effectId === id) next = { ...next, filter: { ...next.filter, effectId: undefined } };
    return next;
  };
  setProject((p) => {
    const effects = { ...p.effects };
    delete effects[id];
    return { effects, clips: p.clips.map(strip) };
  });
}

// Returns the project's effect with this id; a built-in library effect is copied into the project on first use.
export function resolveEffect(id: string, kind: CustomEffect['kind']): string {
  const existing = editor().project.effects[id];
  if (existing?.kind === kind) return id;
  const builtIn = libraryEffect(id);
  if (!existing && builtIn?.kind === kind) {
    const effect: CustomEffect = { id: libraryId(builtIn), name: builtIn.name, kind, code: builtIn.code };
    useEditor.setState((s) => ({ project: { ...s.project, effects: { ...s.project.effects, [effect.id]: effect } } }));
    return effect.id;
  }
  throw new Error(`${kind === 'filter' ? 'Filter' : 'Custom transition'} not found: ${id}`);
}

export function applyFilterEffect(clipId: string, effectId: string | null, amount?: number) {
  const clip = editor().project.clips.find((c) => c.id === clipId);
  if (!clip || clip.type !== 'media') throw new Error(`Clip not found: ${clipId}`);
  if (effectId) resolveEffect(effectId, 'filter');
  const effectAmount = Math.min(Math.max(amount ?? clip.filter.effectAmount ?? 1, 0), 1);
  editor().updateClip(clip.id, { filter: { ...clip.filter, effectId: effectId ?? undefined, effectAmount } });
}

export async function addGoogleFont(name: string): Promise<string> {
  const family = name.trim();
  if (!family) throw new Error('Enter a font family name');
  if (!FONTS.includes(family) && !editor().project.fonts[family]) {
    await checkGoogleFont(family);
    setProject((p) => ({ fonts: { ...p.fonts, [family]: { family } } }));
  }
  return family;
}

const familyFromFile = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

export async function addFontFile(file: Blob, fileName: string, family = familyFromFile(fileName)): Promise<string> {
  if (!family) throw new Error('The font needs a name');
  const data = await toBase64(file);
  try {
    await registerFontFile(family, data);
  } catch {
    throw new Error(`Not a valid font file (TTF, OTF, WOFF or WOFF2): ${fileName}`);
  }
  setProject((p) => ({ fonts: { ...p.fonts, [family]: { family, data } } }));
  return family;
}

export function removeFont(family: string) {
  setProject((p) => {
    const fonts = { ...p.fonts };
    delete fonts[family];
    return { fonts };
  });
}

export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
