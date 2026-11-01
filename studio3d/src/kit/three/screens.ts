import {useMemo} from 'react';
import {CanvasTexture, SRGBColorSpace} from 'three';
import {C, fontFamily, mono} from '../theme';

/** Her karede yeniden çizilen ekran dokusu (tarayıcı, web sitesi). */
export const useCanvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const {canvas, texture} = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return {canvas: cv, texture: tex};
  }, [w, h]);
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  texture.needsUpdate = true;
  return texture;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

export const SCREEN_W = 1360;
export const SCREEN_H = 800;
export const URL_TEXT = 'fityazilim.com';

/** Tarayıcı penceresi: adres çubuğuna URL yazılır, Enter sonrası yükleme çubuğu dolar */
export const drawBrowser = (ctx: CanvasRenderingContext2D, o: {typed: number; cursor: boolean; loading: number; portal: number}) => {
  const W = SCREEN_W;
  const H = SCREEN_H;
  ctx.fillStyle = '#050b18';
  ctx.fillRect(0, 0, W, H);

  // Pencere başlığı
  ctx.fillStyle = '#0b1530';
  ctx.fillRect(0, 0, W, 110);
  ['#3b4a6b', '#3b4a6b', '#3b4a6b'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(46 + i * 36, 55, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  // Adres çubuğu
  roundRect(ctx, 170, 26, W - 240, 58, 29);
  ctx.fillStyle = '#132246';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = o.typed > 0 ? C.cyan : '#22345e';
  ctx.stroke();

  // Kilit simgesi
  ctx.strokeStyle = C.cyanSoft;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(212, 50, 8, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.cyanSoft;
  ctx.fillRect(201, 50, 22, 17);

  const text = URL_TEXT.slice(0, Math.round(o.typed * URL_TEXT.length));
  ctx.font = `500 34px ${mono}`;
  ctx.fillStyle = C.white;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 246, 56);
  if (o.cursor) {
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = C.cyan;
    ctx.fillRect(250 + tw, 36, 3, 40);
  }

  // Yükleme çubuğu
  if (o.loading > 0) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, C.blue);
    g.addColorStop(1, C.cyan);
    ctx.fillStyle = g;
    ctx.fillRect(0, 106, W * o.loading, 6);
  }

  // Sayfa alanı: boş, Enter sonrası merkezden açılan ışık (ekrana dalış kapısı)
  const page = ctx.createRadialGradient(W / 2, H * 0.58, 10, W / 2, H * 0.58, W * 0.7);
  page.addColorStop(0, `rgba(80,200,255,${0.05 + o.portal * 0.95})`);
  page.addColorStop(0.35, `rgba(40,110,255,${0.03 + o.portal * 0.6})`);
  page.addColorStop(1, 'rgba(5,11,24,0)');
  ctx.fillStyle = page;
  ctx.fillRect(0, 112, W, H - 112);

  // Boş sayfa iskeleti
  ctx.fillStyle = `rgba(40,70,130,${0.35 * (1 - o.portal)})`;
  roundRect(ctx, 120, 200, 520, 46, 12);
  ctx.fill();
  roundRect(ctx, 120, 280, 820, 22, 8);
  ctx.fill();
  roundRect(ctx, 120, 324, 700, 22, 8);
  ctx.fill();
};

/** Render sonunda ekranda beliren web sitesi. Yerleşim, Render sahnesindeki 3D katmanlarla aynı. */
export const SITE_BLOCKS = {
  header: {x: 0, y: 0, w: 1360, h: 110},
  hero: {x: 80, y: 170, w: 760, h: 300},
  visual: {x: 900, y: 170, w: 380, h: 300},
  cards: [
    {x: 80, y: 530, w: 380, h: 210},
    {x: 490, y: 530, w: 380, h: 210},
    {x: 900, y: 530, w: 380, h: 210},
  ],
};

export const drawWebsite = (ctx: CanvasRenderingContext2D) => {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#071331');
  bg.addColorStop(1, '#040a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const b = SITE_BLOCKS;
  ctx.fillStyle = '#0b1a3f';
  ctx.fillRect(b.header.x, b.header.y, b.header.w, b.header.h);
  ctx.font = `800 44px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.white;
  ctx.fillText('fit', 80, 56);
  const fw = ctx.measureText('fit').width;
  ctx.fillStyle = C.cyan;
  ctx.fillText('yazılım', 80 + fw, 56);
  ctx.font = `500 28px ${fontFamily}`;
  ctx.fillStyle = '#9fb3d9';
  ['Hizmetler', 'Projeler', 'İletişim'].forEach((s, i) => ctx.fillText(s, 860 + i * 170, 56));

  ctx.font = `800 76px ${fontFamily}`;
  ctx.fillStyle = C.white;
  ctx.fillText('Merhaba,', b.hero.x, b.hero.y + 70);
  ctx.fillStyle = C.cyan;
  ctx.fillText('internet.', b.hero.x, b.hero.y + 160);
  ctx.font = `500 30px ${fontFamily}`;
  ctx.fillStyle = '#9fb3d9';
  ctx.fillText('Bu sayfa saniyeler içinde sana ulaştı.', b.hero.x, b.hero.y + 240);

  const vg = ctx.createLinearGradient(b.visual.x, b.visual.y, b.visual.x + b.visual.w, b.visual.y + b.visual.h);
  vg.addColorStop(0, C.blue);
  vg.addColorStop(1, C.violet);
  roundRect(ctx, b.visual.x, b.visual.y, b.visual.w, b.visual.h, 28);
  ctx.fillStyle = vg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(b.visual.x + b.visual.w / 2, b.visual.y + b.visual.h / 2, 80, 0, Math.PI * 2);
  ctx.stroke();

  b.cards.forEach((c, i) => {
    roundRect(ctx, c.x, c.y, c.w, c.h, 22);
    ctx.fillStyle = '#0e2049';
    ctx.fill();
    ctx.strokeStyle = i === 1 ? C.violet : C.cyan;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = i === 1 ? C.violet : C.cyan;
    roundRect(ctx, c.x + 30, c.y + 34, 56, 56, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,185,230,0.55)';
    roundRect(ctx, c.x + 30, c.y + 120, c.w - 90, 18, 6);
    ctx.fill();
    roundRect(ctx, c.x + 30, c.y + 154, c.w - 160, 18, 6);
    ctx.fill();
  });
};
