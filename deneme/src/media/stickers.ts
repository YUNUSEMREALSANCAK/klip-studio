// Stickers: emoji drawn into a transparent PNG and placed as an overlay, like CapCut's sticker panel.

export const STICKER_GROUPS: { label: string; emoji: string[] }[] = [
  { label: 'Reactions', emoji: ['😂', '😍', '🤯', '😮', '😢', '😎', '🤔', '🙌', '👏', '🔥', '❤️', '💯', '🎉', '✨', '👍', '👎'] },
  { label: 'Pointers', emoji: ['👉', '👈', '👆', '👇', '➡️', '⬅️', '⬆️', '⬇️', '↩️', '🔄', '👀', '☝️'] },
  { label: 'Signs', emoji: ['✅', '❌', '⚠️', '❓', '❗', '⭐', '📌', '🔔', '🚫', '💬', '🏆', '🎯'] },
  { label: 'Tech', emoji: ['💻', '📱', '⚡', '🚀', '💡', '🔒', '🔑', '⚙️', '🌐', '📡', '🤖', '🧠'] },
];

const SIZE = 512;
const FONT = `${Math.round(SIZE * 0.82)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

// Renders an emoji to a square, transparent PNG.
export async function renderSticker(emoji: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d')!;
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, SIZE / 2, SIZE * 0.54);
  return canvas.convertToBlob({ type: 'image/png' });
}
