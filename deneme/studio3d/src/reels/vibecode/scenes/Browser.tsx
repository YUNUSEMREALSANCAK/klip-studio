import React from 'react';
import {Img, staticFile} from 'remotion';
import {B, easeInOut, mono, pop, prog} from '../../../kit2d/brand';

/* canivibecodeit.com ekran görüntülerini gösteren tarayıcı penceresi.
   Görüntüler 800 px genişlikte (CSS) çekildi; "view" o koordinatlarda bir kadraj:
   (x, y) sol üst köşe, w görünen genişlik. Kadrajlar arasında kamera yumuşakça kayar. */

export const SITE_BG = '#0B0D0B';
export const SITE_BOX = '#131613';
export const SITE_GREEN = '#3DDC84';
const PAGE_W = 800;

export type View = {t: number; x: number; y: number; w: number; dur?: number};
export type Page = {at: number; src: string; url: string};

const viewAt = (views: View[], t: number) => {
  let {x, y, w} = views[0];
  for (const v of views.slice(1)) {
    const k = easeInOut(prog(t, v.t, v.dur ?? 0.7));
    x += (v.x - x) * k;
    y += (v.y - y) * k;
    w += (v.w - w) * k;
  }
  return {x, y, w};
};

type BrowserProps = {
  t: number;
  pages: Page[];
  views: View[];
  /** Pencerenin ekrana girdiği an */
  enter: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  /** Adres çubuğuna harf harf yazılır */
  typeUrl?: {at: number; text: string; speed?: number};
  /** Kadraja bağlı katman (sayfa koordinatlarında) */
  children?: React.ReactNode;
};

const UrlBar: React.FC<{url: string; loading: number; caret: boolean}> = ({url, loading, caret}) => (
  <div style={{height: 70, background: B.ink2, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', position: 'relative'}}>
    {[B.orange, B.lemon, B.mint].map((c) => (
      <span key={c} style={{width: 20, height: 20, borderRadius: 10, background: c}} />
    ))}
    <div
      style={{
        flex: 1,
        marginLeft: 10,
        height: 42,
        borderRadius: 21,
        background: B.ink,
        color: B.paper,
        fontFamily: mono,
        fontWeight: 600,
        fontSize: 24,
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <svg width={22} height={26} viewBox="0 0 22 26" style={{marginRight: 12, flex: '0 0 auto'}}>
        <path d="M5 11 V7 A6 6 0 0 1 17 7 V11" stroke={B.mint} strokeWidth={3.5} fill="none" />
        <rect x={1} y={11} width={20} height={14} rx={4} fill={B.mint} />
      </svg>
      {url}
      {caret ? <span style={{width: 3, height: 26, background: B.mint, marginLeft: 3}} /> : null}
    </div>
    {loading > 0 && loading < 1 ? (
      <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${loading * 100}%`, background: B.mint}} />
    ) : null}
  </div>
);

export const Browser: React.FC<BrowserProps> = ({t, pages, views, enter, left = 100, top = 560, width = 880, height = 520, typeUrl, children}) => {
  const q = pop(t, enter, 0.5);
  const current = pages.reduce((acc, p, i) => (t >= p.at ? i : acc), 0);
  const page = pages[current];
  const loading = current > 0 ? prog(t, page.at - 0.05, 0.45) : 0;
  const {x, y, w} = viewAt(views, t);
  const k = width / w;
  let url = page.url;
  let caret = false;
  if (typeUrl && t >= typeUrl.at - 0.5) {
    const n = Math.floor(Math.max(0, t - typeUrl.at) / (typeUrl.speed ?? 0.05));
    url = typeUrl.text.slice(0, n);
    caret = n < typeUrl.text.length || Math.floor(t * 2.5) % 2 === 0;
  }
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        borderRadius: 30,
        border: `6px solid ${B.ink}`,
        boxShadow: `12px 14px 0 ${B.ink}`,
        overflow: 'hidden',
        background: SITE_BG,
        opacity: Math.min(1, q * 1.5),
        transform: `translateY(${(1 - q) * 120}px) scale(${0.9 + 0.1 * q})`,
      }}
    >
      <UrlBar url={url} loading={loading} caret={caret} />
      <div style={{position: 'relative', height, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: PAGE_W, transform: `scale(${k}) translate(${-x}px, ${-y}px)`, transformOrigin: '0 0'}}>
          {pages.map((p, i) => {
            const shown = i === current ? 1 : i === current - 1 ? 1 - prog(t, page.at, 0.2) : 0;
            return shown > 0 ? (
              <Img key={p.src} src={staticFile(`reels/vibecode/site/${p.src}`)} style={{position: 'absolute', left: 0, top: 0, width: PAGE_W, opacity: shown}} />
            ) : null;
          })}
          {children}
        </div>
      </div>
    </div>
  );
};

/** Sayfa koordinatlarında vurgulu çerçeve (fosforlu kalem gibi) */
export const Mark: React.FC<{t: number; at: number; to?: number; x: number; y: number; w: number; h: number; color?: string}> = ({t, at, to = 99, x, y, w, h, color = B.lemon}) => {
  const q = easeInOut(prog(t, at, 0.3)) * (1 - prog(t, to, 0.2));
  if (q <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 8,
        border: `3px solid ${color}`,
        background: `${color}22`,
        boxShadow: `0 0 0 4px ${color}44`,
        opacity: q,
        transform: `scale(${0.85 + 0.15 * q})`,
      }}
    />
  );
};
