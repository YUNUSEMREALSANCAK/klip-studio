// Sound effects: real CC0 recordings bundled in public/sfx (built by scripts/build-sfx-library.mjs).
// Whooshes are pre-softened above 5.5 kHz so transitions don't sound harsh.

export interface LibrarySound {
  id: string; // "<category>/<name>"
  name: string;
  category: string;
  file: string; // relative to sfx/
  duration: number;
  author: string;
  url: string;
  license: string;
  pack?: string; // id of the sound pack it belongs to
  use?: string; // where the pack's video used it
  moment?: number; // s in that video
}

// The finished sounds of one video, named for reuse (public/sfx/packs.json, built by scripts/build-sfx-pack.mjs).
export interface SoundPack {
  id: string;
  title: string;
  description: string;
  sounds: LibrarySound[];
}

export type SoundEffect = 'whoosh' | 'pop' | 'ding' | 'click' | 'riser' | 'boom' | 'glitch' | 'typing';

// One-click picks; each points to a recording in the library.
export const SOUND_EFFECTS: { id: SoundEffect; label: string; sound: string }[] = [
  { id: 'whoosh', label: 'Whoosh', sound: 'whoosh/soft_swoosh_with_noisy_ambience_623709' },
  { id: 'pop', label: 'Pop', sound: 'pop/plop_447910' },
  { id: 'ding', label: 'Ding', sound: 'chime/success_bell_511484' },
  { id: 'click', label: 'Click', sound: 'click/enter_key_180997' },
  { id: 'riser', label: 'Riser', sound: 'riser/riser_sound_effect_short_685256' },
  { id: 'boom', label: 'Boom', sound: 'impact/muffled_distant_explosion_149966' },
  { id: 'glitch', label: 'Glitch', sound: 'glitch/interference_58929' },
  { id: 'typing', label: 'Typing', sound: 'typing/keyboard_typing_79388' },
];

export const SOUND_CATEGORIES: { id: string; label: string }[] = [
  { id: 'whoosh', label: 'Whoosh' },
  { id: 'riser', label: 'Riser' },
  { id: 'impact', label: 'Impact' },
  { id: 'pop', label: 'Pop' },
  { id: 'chime', label: 'Chime' },
  { id: 'click', label: 'Click' },
  { id: 'typing', label: 'Typing' },
  { id: 'ui', label: 'Interface' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'scifi', label: 'Sci-fi' },
  { id: 'ambience', label: 'Ambience' },
];

const base = () => import.meta.env.BASE_URL ?? '/';

export const soundUrl = (sound: LibrarySound) => `${base()}sfx/${sound.file}`;

let catalog: Promise<LibrarySound[]> | null = null;
let packs: Promise<SoundPack[]> | null = null;

export function loadSoundPacks(): Promise<SoundPack[]> {
  packs ??= fetch(`${base()}sfx/packs.json`)
    .then((response) => (response.ok ? (response.json() as Promise<SoundPack[]>) : []))
    .then((list) => list.map((p) => ({ ...p, sounds: p.sounds.map((s) => ({ ...s, pack: p.id })) })))
    .catch(() => []);
  return packs;
}

// The recorded library plus every pack's sounds.
export function loadSoundLibrary(): Promise<LibrarySound[]> {
  catalog ??= Promise.all([
    fetch(`${base()}sfx/catalog.json`).then((response) => {
      if (!response.ok) throw new Error('Could not load the sound library');
      return response.json() as Promise<LibrarySound[]>;
    }),
    loadSoundPacks(),
  ]).then(([library, list]) => [...library, ...list.flatMap((p) => p.sounds)]);
  catalog.catch(() => (catalog = null));
  return catalog;
}

// Accepts a one-click pick ("whoosh") or a library id ("whoosh/whoosh_60013").
export async function findSound(idOrEffect: string): Promise<LibrarySound> {
  const id = SOUND_EFFECTS.find((s) => s.id === idOrEffect)?.sound ?? idOrEffect;
  const sound = (await loadSoundLibrary()).find((s) => s.id === id);
  if (!sound) throw new Error(`Unknown sound effect: ${idOrEffect}`);
  return sound;
}

export async function fetchSound(sound: LibrarySound): Promise<Blob> {
  const response = await fetch(soundUrl(sound));
  if (!response.ok) throw new Error(`Could not load sound: ${sound.name}`);
  return response.blob();
}
