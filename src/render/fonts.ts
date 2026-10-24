import type { CustomFont, TextClip } from '../core/types';

// Google Fonts families for text clips; loaded on first use.
export const FONTS = ['Inter', 'Bebas Neue', 'Montserrat', 'Poppins', 'Oswald', 'Anton', 'Playfair Display', 'Lobster', 'Pacifico', 'Roboto Mono'];

export const FONT_FILE_TYPES = '.ttf,.otf,.woff,.woff2';

const loaded = new Map<string, Promise<void>>();
const files = new Map<string, Promise<void>>(); // uploaded font files; they win over a Google Fonts family of the same name

const googleCss = (family: string) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700;800&display=swap`;

export function ensureFont(family: string): Promise<void> {
  if (!loaded.has(family)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleCss(family);
    document.head.appendChild(link);
    loaded.set(
      family,
      new Promise<void>((resolve) => (link.onload = () => resolve()))
        .then(() => document.fonts.load(`700 48px "${family}"`))
        .then(() => undefined)
        .catch(() => undefined),
    );
  }
  return loaded.get(family)!;
}

// Registers an uploaded font file. One face covers every weight, so bold text doesn't get a synthetic fallback.
export function registerFontFile(family: string, base64: string): Promise<void> {
  if (!files.has(family)) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const ready = new FontFace(family, bytes, { weight: '100 900' }).load().then((face) => void document.fonts.add(face));
    files.set(family, ready);
    loaded.set(family, ready);
    ready.catch(() => files.delete(family));
  }
  return files.get(family)!;
}

// Throws if Google Fonts has no family with this exact name.
export async function checkGoogleFont(family: string) {
  const response = await fetch(googleCss(family));
  if (!response.ok) throw new Error(`Google Fonts family not found: ${family}`);
}

export const registerProjectFonts = (fonts: Record<string, CustomFont>) =>
  Promise.all(Object.values(fonts).map((f) => (f.data ? registerFontFile(f.family, f.data) : ensureFont(f.family)).catch(() => undefined)));

export const fontFamilies = (fonts: Record<string, CustomFont>) => [...FONTS, ...Object.keys(fonts).filter((f) => !FONTS.includes(f))];

export const familyOf = (clip: TextClip) => clip.font ?? (clip.preset === 'title' ? 'Bebas Neue' : 'Inter');

// Waits until every font in the project is ready before export.
export const ensureFonts = (clips: TextClip[]) => Promise.all([...new Set(clips.map(familyOf))].map(ensureFont));
