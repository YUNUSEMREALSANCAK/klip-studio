import { create } from 'zustand';
import { TR } from './tr';

// UI language. Source strings are English; the Turkish translation lives in ./tr.ts.

export type Lang = 'en' | 'tr';

const STORAGE_KEY = 'klip-lang';

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

const startLang = initialLang();
// CSS text-transform (e.g. uppercase i → İ) follows the document language.
document.documentElement.lang = startLang;

export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: startLang,
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable: the choice applies to this session only.
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

// Translates an English UI string into the selected language.
export function tr(text: string): string {
  return useLang.getState().lang === 'tr' ? (TR[text] ?? text) : text;
}

// Also translates prefixed dynamic messages such as "Error: …" or "Importing: clip.mp4".
export function trMessage(text: string): string {
  if (useLang.getState().lang !== 'tr' || TR[text]) return tr(text);
  const split = text.indexOf(': ');
  if (split < 0) return text;
  const head = text.slice(0, split);
  const translatedHead = TR[head] ?? TR[`${head}:`]?.replace(/:$/, '') ?? head;
  return `${translatedHead}: ${trMessage(text.slice(split + 2))}`;
}
