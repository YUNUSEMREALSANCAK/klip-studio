import { create } from 'zustand';
import { EN } from './en';

// Arayüz dili. Anahtar Türkçe metnin kendisidir; çevirisi olmayan metin Türkçe görünür.

export type Lang = 'tr' | 'en';

const STORAGE_KEY = 'klip-lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    // Depolama kapalıysa tarayıcı diline bak.
  }
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

const startLang = initialLang();
// CSS büyük harf dönüşümü (ör. i → İ) sayfa diline göre yapılır.
document.documentElement.lang = startLang;

export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: startLang,
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Yalnız bu oturum için geçerli olur.
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

// translate: Türkçe metni seçili dile çevirir.
export function tr(text: string): string {
  return useLang.getState().lang === 'en' ? (EN[text] ?? text) : text;
}

// Önekli dinamik mesajları da çevirir: "Hata: …", "İçe aktarılıyor: dosya.mp4".
export function trMessage(text: string): string {
  if (useLang.getState().lang !== 'en' || EN[text]) return tr(text);
  const split = text.indexOf(': ');
  if (split < 0) return text;
  const head = text.slice(0, split);
  const translatedHead = EN[head] ?? EN[`${head}:`]?.replace(/:$/, '') ?? head;
  return `${translatedHead}: ${trMessage(text.slice(split + 2))}`;
}
