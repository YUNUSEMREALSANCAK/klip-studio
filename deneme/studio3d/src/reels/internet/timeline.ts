import {sec} from '../../kit/theme';
import {useGlobalTime} from '../../kit/three/util';

/* Fityazılım 03 · İnternetin içinde bir yolculuk.
   Tüm saniyeler seslendirmenin whisper çıktısından (public/kelimeler.json). */

/** Sahne aralıkları [başlangıç, bitiş] (sn). Geçişler için komşu sahneler XFADE kadar üst üste biner. */
export const SCENES = {
  computer: [0, 9.3], // "İnternetin içinde bir yolculuğa…" + URL + Enter
  globe: [9.1, 14.4], // "Peki bu istek … dünyanın diğer ucundaki bir sunucuya nasıl ulaşıyor?"
  dns: [14.2, 37.9], // DNS önbelleği → Resolver → Root/TLD/Authoritative → IP
  handshake: [37.7, 49.7], // HTTP/3 · QUIC · TLS 1.3
  packets: [49.5, 61.8], // HTTP GET → IP paketleri → Router'lar
  server: [61.6, 69.3], // Application Server · Database · HTTP Response
  back: [69.1, 72.4], // "Yanıt ağ üzerinden tekrar istemciye gönderiliyor."
  render: [72.2, 82.5], // Render Tree · Layout · Paint · Compositing → site
  finale: [82.3, 92.2], // "İşte internet dediğimiz şey…" + kapanış
} as const;

export type SceneKey = keyof typeof SCENES;
export const XFADE = 0.2;
export const OUTRO_AT = 88.9;
export const TOTAL_FRAMES = sec(92.2);

/* Kelime zamanları (sn) */
export const COMPUTER = {typeStart: 3.43, typeEnd: 4.15, enter: 4.75, dive: 5.9, through: 7.2};
export const GLOBE = {start: 9.22, launch: 10.3, far: 12.1, question: 12.99};
export const DNS = {
  title: 15.05,
  browserCache: 16.32,
  osCache: 17.14,
  checked: 18.93,
  miss: 20.7,
  query: 21.42,
  resolver: 22.71,
  resolverAgain: 24.74,
  root: 27.27,
  tld: 27.98,
  auth: 28.74,
  found: 33.18,
  known: 34.96,
};
export const HANDSHAKE = {start: 37.76, http3: 39.96, udp: 41.22, quic: 42.12, tls: 43.56, setup: 44.85, merge: 46.48, ready: 48.42};
export const PACKETS = {get: 49.66, send: 50.72, ip: 52.53, split: 53.4, travel: 55.07, router: 56.44, table: 57.19, next: 59.63, forward: 60.48};
export const SERVER = {app: 61.77, process: 63.33, db: 64.73, pull: 65.96, response: 67.08, create: 67.59, out: 69.14};
export const RENDER = {arrive: 72.24, notYet: 72.81, tree: 74.2, layout: 75.08, paint: 75.67, compositing: 76.2, done: 77.71, site: 79.13, reveal: 80.85};
export const FINALE = {start: 82.32, internet: 82.4, seconds: 83.96, protocol: 86.34, system: 87.21};

/** Sahnenin içinde seslendirmeyle aynı (global) saniye */
export const useSceneTime = (key: SceneKey) => useGlobalTime(SCENES[key][0]);
