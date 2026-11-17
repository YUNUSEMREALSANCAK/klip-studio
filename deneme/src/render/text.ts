import type { TextClip } from '../core/types';
import { ensureFont, familyOf } from './fonts';

const DEFAULT_DURATION = 0.3;

interface Animated {
  alpha: number;
  scale: number;
  offsetY: number; // downward shift, fraction of the canvas height
  blur: number; // fraction of the font size
  visibleChars: number;
}

// Word-by-word animations; the others move the whole text.
const PER_WORD = new Set(['rise', 'wordpop']);

// The change an animation makes at progress p (0 = hidden, 1 = settled), for in and out alike.
function applyAnimation(state: Animated, type: string | undefined, p: number, chars: number) {
  switch (type) {
    case 'fade':
      state.alpha *= p;
      break;
    case 'pop':
      state.scale *= (0.6 + 0.4 * p) * (1 + Math.sin(p * Math.PI) * 0.12);
      state.alpha *= p;
      break;
    case 'slideup':
      state.offsetY += (1 - easeOut(p)) * 0.04;
      state.alpha *= p;
      break;
    case 'typewriter':
      state.visibleChars = Math.min(state.visibleChars, chars);
      break;
    case 'bounce':
      state.scale *= bounceOut(p);
      state.alpha *= Math.min(1, p * 3);
      break;
    case 'zoom':
      state.scale *= 1.6 - 0.6 * easeOut(p);
      state.alpha *= p;
      break;
    case 'blur':
      state.blur += (1 - p) * 0.35;
      state.alpha *= p;
      break;
    case 'drop':
      state.offsetY -= (1 - bounceOut(p)) * 0.08;
      state.alpha *= Math.min(1, p * 3);
      break;
  }
}

function animate(clip: TextClip, t: number): Animated {
  const local = t - clip.start;
  const remaining = clip.start + clip.duration - t;
  const state: Animated = { alpha: 1, scale: 1, offsetY: 0, blur: 0, visibleChars: Infinity };
  const inDuration = clip.animationInDuration ?? DEFAULT_DURATION;
  const p = inDuration > 0 ? Math.min(local / inDuration, 1) : 1;
  if (!PER_WORD.has(clip.animation)) applyAnimation(state, clip.animation, p, Math.floor((local / Math.max(inDuration, 0.05)) * 7));
  // Older projects have no out animation: a fading text fades out briefly, as before.
  const outType = clip.animationOut ?? (clip.animation === 'fade' ? 'fade' : 'none');
  const outDuration = clip.animationOut ? (clip.animationOutDuration ?? DEFAULT_DURATION) : 0.15;
  const q = outDuration > 0 ? Math.min(Math.max(remaining, 0) / outDuration, 1) : 1;
  if (!PER_WORD.has(outType)) applyAnimation(state, outType, q, Math.floor((remaining / Math.max(outDuration, 0.05)) * 7));
  return state;
}

// Per-word state for word-by-word animations: words enter (and leave) one after another.
function wordAnimation(clip: TextClip, t: number, index: number, count: number) {
  const state = { alpha: 1, scale: 1, rise: 0 };
  const step = (type: string | undefined, elapsed: number, duration: number) => {
    if (!type || !PER_WORD.has(type)) return;
    const stagger = Math.min(0.12, (duration * 0.6) / Math.max(1, count - 1));
    const p = Math.min(Math.max((elapsed - index * stagger) / Math.max(duration * 0.5, 0.08), 0), 1);
    state.alpha *= p;
    if (type === 'rise') state.rise += (1 - easeOut(p)) * 0.5;
    else state.scale *= p === 0 ? 0 : bounceOut(p);
  };
  step(clip.animation, t - clip.start, clip.animationInDuration ?? DEFAULT_DURATION);
  if (clip.animationOut) step(clip.animationOut, clip.start + clip.duration - t, clip.animationOutDuration ?? DEFAULT_DURATION);
  return state;
}

// Which word is being spoken: from the caption's word timings, or the duration split evenly.
export function activeWord(clip: TextClip, t: number, count: number): number {
  if (clip.words?.length) {
    const i = clip.words.findIndex((w) => t >= w.start && t < w.end);
    if (i >= 0 || clip.preset !== 'single') return i;
    // Between words a single-word caption keeps showing the last one spoken.
    const spoken = clip.words.filter((w) => w.start <= t).length;
    return Math.max(0, spoken - 1);
  }
  if (clip.preset !== 'highlight' && clip.preset !== 'single') return -1;
  return Math.min(count - 1, Math.max(0, Math.floor(((t - clip.start) / clip.duration) * count)));
}

const bounceOut = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 + 2.2 * Math.pow(2, -10 * x) * Math.sin((x - 0.075) * ((2 * Math.PI) / 0.3)) * (1 - x);
};

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

// Draws a text clip onto the canvas. The karaoke, highlight and single styles follow the word being spoken.
export function drawText(ctx: Ctx, clip: TextClip, t: number, W: number, H: number) {
  void ensureFont(familyOf(clip)); // drawn with a fallback font until loaded
  const anim = animate(clip, t);
  const size = clip.fontSize * H;
  ctx.save();
  applyTextStyle(ctx, clip, size);
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = anim.alpha;
  if (anim.blur > 0) ctx.filter = `blur(${(anim.blur * size).toFixed(1)}px)`;

  const display = clip.preset === 'title' ? clip.text.toUpperCase() : clip.text;
  const allWords = display.split(/\s+/).filter(Boolean);
  const activeIndex = activeWord(clip, t, allWords.length);
  // One word at a time: only the spoken word is drawn, popping in as it starts.
  const words = clip.preset === 'single' ? allWords.slice(activeIndex, activeIndex + 1) : display.slice(0, anim.visibleChars).split(/\s+/).filter(Boolean);
  const lines = wrapWords(ctx, words, W * 0.86);
  const lineHeight = size * 1.25;
  const centerY = (clip.y + anim.offsetY) * H;
  const top = centerY - ((lines.length - 1) * lineHeight) / 2;

  let scale = anim.scale;
  if (clip.preset === 'single' && clip.words?.[activeIndex]) scale *= bounceOut(Math.min(1, (t - clip.words[activeIndex].start) / 0.18));
  ctx.translate(W / 2, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -centerY);

  let wordIndex = 0;
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    const width = ctx.measureText(line.join(' ')).width;
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
      const index = clip.preset === 'single' ? activeIndex : wordIndex;
      const isActive = clip.preset !== 'single' && index === activeIndex;
      const w = wordAnimation(clip, t, wordIndex, words.length);
      if (w.alpha > 0 && w.scale > 0) {
        ctx.save();
        ctx.globalAlpha = anim.alpha * w.alpha;
        const cx = x + wordWidth / 2;
        ctx.translate(cx, y + w.rise * size);
        ctx.scale(w.scale, w.scale);
        ctx.translate(-cx, -y);
        if (isActive && clip.preset === 'highlight') {
          const pad = size * 0.12;
          ctx.fillStyle = clip.highlight;
          roundRect(ctx, x - pad, y - size * 0.62, wordWidth + pad * 2, size * 1.24, size * 0.18);
          ctx.fill();
        }
        drawWord(ctx, clip, word, x, y, size, isActive);
        ctx.restore();
      }
      x += wordWidth + ctx.measureText(' ').width;
      wordIndex++;
    }
  });
  ctx.restore();
}

function drawWord(ctx: Ctx, clip: TextClip, word: string, x: number, y: number, size: number, active: boolean) {
  const boxed = active && clip.preset === 'highlight';
  if (boxed) active = false; // the word sits on the highlight box in its own color
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
