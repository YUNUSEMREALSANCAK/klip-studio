import type { TextClip } from '../core/types';

// Metin klipleri için Google Fonts aileleri; ilk kullanımda yüklenir.
export const FONTS = ['Inter', 'Bebas Neue', 'Montserrat', 'Poppins', 'Oswald', 'Anton', 'Playfair Display', 'Lobster', 'Pacifico', 'Roboto Mono'];

const loaded = new Map<string, Promise<void>>();

export function ensureFont(family: string): Promise<void> {
  if (!loaded.has(family)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700;800&display=swap`;
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

export const familyOf = (clip: TextClip) => clip.font ?? (clip.preset === 'title' ? 'Bebas Neue' : 'Inter');

// Dışa aktarmadan önce projedeki tüm yazı tiplerinin hazır olmasını bekler.
export const ensureFonts = (clips: TextClip[]) => Promise.all([...new Set(clips.map(familyOf))].map(ensureFont));
