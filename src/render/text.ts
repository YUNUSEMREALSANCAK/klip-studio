import type { TextClip } from '../core/types';
import { ensureFont, familyOf } from './fonts';

const IN_DURATION = 0.3;

interface Animated {
  alpha: number;
  scale: number;
  offsetY: number;
  visibleChars: number;
}

function animate(clip: TextClip, t: number): Animated {
  const local = t - clip.start;
  const p = Math.min(local / IN_DURATION, 1);
  const out = Math.min((clip.start + clip.duration - t) / 0.15, 1);
  const state: Animated = { alpha: 1, scale: 1, offsetY: 0, visibleChars: Infinity };
  switch (clip.animation) {
    case 'fade':
      state.alpha = Math.min(p, out);
      break;
    case 'pop': {
      const overshoot = 1 + Math.sin(p * Math.PI) * 0.12;
      state.scale = (0.6 + 0.4 * p) * overshoot;
      state.alpha = p;
      break;
    }
    case 'slideup':
      state.offsetY = (1 - easeOut(p)) * 0.04;
      state.alpha = p;
      break;
    case 'typewriter':
      state.visibleChars = Math.floor(local / 0.045);
      break;
  }
  return state;
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

export function fontFor(clip: TextClip, size: number) {
  const family = familyOf(clip);
  // Bebas Neue is a single-weight condensed face; scaled up to match the visual size.
  if (family === 'Bebas Neue') return `${size * 1.3}px "Bebas Neue", Inter, sans-serif`;
  return `${family === 'Inter' ? 800 : 700} ${size}px "${family}", Inter, sans-serif`;
}

// Font and letter spacing for a text clip; shared by drawing and measuring so both wrap the same way.
export function applyTextStyle(ctx: Ctx, clip: TextClip, size: number) {
  ctx.font = fontFor(clip, size);
  ctx.letterSpacing = `${(clip.letterSpacing ?? 0) * size}px`;
}

export function wrapWords(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, words: string[], maxWidth: number) {
  const lines: string[][] = [[]];
  for (const word of words) {
    const line = lines[lines.length - 1];
    const candidate = [...line, word].join(' ');
    if (line.length && ctx.measureText(candidate).width > maxWidth) lines.push([word]);
    else line.push(word);
  }
  return lines;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// Draws a text clip onto the canvas. The karaoke style highlights the word being spoken.
export function drawText(ctx: Ctx, clip: TextClip, t: number, W: number, H: number) {
  void ensureFont(familyOf(clip)); // drawn with a fallback font until loaded
  const anim = animate(clip, t);
  const size = clip.fontSize * H;
  ctx.save();
  applyTextStyle(ctx, clip, size);
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = anim.alpha;

  const display = clip.preset === 'title' ? clip.text.toUpperCase() : clip.text;
  const visible = display.slice(0, anim.visibleChars);
  const words = visible.split(/\s+/).filter(Boolean);
  const lines = wrapWords(ctx, words, W * 0.86);
  const lineHeight = size * 1.25;
  const centerY = (clip.y - anim.offsetY) * H;
  const top = centerY - ((lines.length - 1) * lineHeight) / 2;

  ctx.translate(W / 2, centerY);
  ctx.scale(anim.scale, anim.scale);
  ctx.translate(-W / 2, -centerY);

  // Karaoke: match word order against the source words.
  const activeIndex = clip.preset === 'karaoke' && clip.words ? clip.words.findIndex((w) => t >= w.start && t < w.end) : -1;
  let wordIndex = 0;

  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    const text = line.join(' ');
    const width = ctx.measureText(text).width;
    let x = W / 2 - width / 2;

    if (clip.preset === 'box') {
      const pad = size * 0.3;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = withAlpha(clip.boxColor ?? '#000000', 0.65);
      roundRect(ctx, x - pad, y - lineHeight / 2, width + pad * 2, lineHeight, size * 0.25);
      ctx.fill();
    }

    for (const word of line) {
      const wordWidth = ctx.measureText(word).width;
      const isActive = wordIndex === activeIndex;
      drawWord(ctx, clip, word, x, y, size, isActive);
      x += wordWidth + ctx.measureText(' ').width;
      wordIndex++;
    }
  });
  ctx.restore();
}

function drawWord(ctx: Ctx, clip: TextClip, word: string, x: number, y: number, size: number, active: boolean) {
  const color = active ? clip.highlight : clip.color;
  ctx.lineJoin = 'round';
  if (clip.preset === 'neon') {
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, x, y);
    ctx.shadowBlur = size * 0.2;
    ctx.fillText(word, x, y);
    ctx.shadowBlur = 0;
    return;
  }
  if (clip.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.15;
    ctx.shadowOffsetY = size * 0.06;
  }
  const outline = clip.outlineWidth ?? (clip.preset === 'box' ? 0 : 0.14);
  if (outline > 0) {
    ctx.strokeStyle = clip.outlineColor ?? 'rgba(0,0,0,0.9)';
    ctx.lineWidth = size * outline;
    ctx.strokeText(word, x, y);
    ctx.shadowColor = 'transparent';
  }
  if (active) {
    ctx.save();
    const cx = x + ctx.measureText(word).width / 2;
    ctx.translate(cx, y);
    ctx.scale(1.08, 1.08);
    ctx.translate(-cx, -y);
    ctx.fillStyle = color;
    ctx.fillText(word, x, y);
    ctx.restore();
    return;
  }
  ctx.fillStyle = color;
  ctx.fillText(word, x, y);
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
