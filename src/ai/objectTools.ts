import type { SamMessage, SamRequest } from './sam.worker';

export interface SamPoint {
  x: number; // 0..1
  y: number; // 0..1
  positive: boolean;
}

export interface BinaryMask {
  data: Uint8Array; // 1 = seçili
  width: number;
  height: number;
}

// SlimSAM worker'ı için söz (promise) tabanlı küçük istemci.
export class SamClient {
  private worker = new Worker(new URL('./sam.worker.ts', import.meta.url), { type: 'module' });
  onProgress: (message: string, progress: number) => void = () => {};

  private request<T extends SamMessage['type']>(message: SamRequest, expect: T, transfer: Transferable[] = []) {
    return new Promise<Extract<SamMessage, { type: T }>>((resolve, reject) => {
      this.worker.onmessage = ({ data }: MessageEvent<SamMessage>) => {
        if (data.type === 'progress') this.onProgress(data.message, data.progress);
        else if (data.type === 'error') reject(new Error(data.message));
        else if (data.type === expect) resolve(data as Extract<SamMessage, { type: T }>);
      };
      this.worker.postMessage(message, transfer);
    });
  }

  async embed(image: ImageData) {
    await this.request({ type: 'embed', image }, 'embedded');
  }

  async decode(points: SamPoint[]): Promise<BinaryMask> {
    const result = await this.request({ type: 'decode', points }, 'mask');
    return { data: result.mask, width: result.width, height: result.height };
  }

  // Gömme ve maske çıkarmayı tek istekte yapar (video takibinde her kare için).
  async segment(image: ImageData, points: SamPoint[]): Promise<BinaryMask> {
    const result = await this.request({ type: 'segment', image, points }, 'mask');
    return { data: result.mask, width: result.width, height: result.height };
  }

  dispose() {
    this.worker.terminate();
  }
}

export function dilate(mask: BinaryMask, radius: number): BinaryMask {
  const { width, height } = mask;
  let current = mask.data;
  for (let step = 0; step < radius; step++) {
    const next = new Uint8Array(current);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (current[i]) continue;
        if ((x > 0 && current[i - 1]) || (x < width - 1 && current[i + 1]) || (y > 0 && current[i - width]) || (y < height - 1 && current[i + width])) {
          next[i] = 1;
        }
      }
    }
    current = next;
  }
  return { data: current, width, height };
}

interface Level {
  width: number;
  height: number;
  rgb: Float32Array; // ağırlıkla çarpılmamış renk
  weight: Float32Array; // 1 = bilinen piksel
}

// Push-pull doldurma: maskelenen bölgeyi çevresindeki renklerden çok ölçekli olarak tamamlar.
export function inpaint(image: ImageData, mask: BinaryMask): ImageData {
  const { width, height } = image;
  const grown = dilate(mask, 4);
  const base: Level = { width, height, rgb: new Float32Array(width * height * 3), weight: new Float32Array(width * height) };
  for (let i = 0; i < width * height; i++) {
    base.weight[i] = grown.data[i] ? 0 : 1;
    base.rgb[i * 3] = image.data[i * 4];
    base.rgb[i * 3 + 1] = image.data[i * 4 + 1];
    base.rgb[i * 3 + 2] = image.data[i * 4 + 2];
  }

  const levels = [base];
  while (levels[levels.length - 1].width > 1 || levels[levels.length - 1].height > 1) {
    levels.push(downsample(levels[levels.length - 1]));
  }
  for (let l = levels.length - 2; l >= 0; l--) pullUp(levels[l], levels[l + 1]);

  const out = new ImageData(new Uint8ClampedArray(image.data), width, height);
  for (let i = 0; i < width * height; i++) {
    if (!grown.data[i]) continue;
    out.data[i * 4] = base.rgb[i * 3];
    out.data[i * 4 + 1] = base.rgb[i * 3 + 1];
    out.data[i * 4 + 2] = base.rgb[i * 3 + 2];
  }
  return out;
}

function downsample(level: Level): Level {
  const width = Math.max(1, Math.ceil(level.width / 2));
  const height = Math.max(1, Math.ceil(level.height / 2));
  const rgb = new Float32Array(width * height * 3);
  const weight = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let w = 0;
      const sum = [0, 0, 0];
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(x * 2 + dx, level.width - 1);
          const sy = Math.min(y * 2 + dy, level.height - 1);
          const i = sy * level.width + sx;
          const wi = level.weight[i];
          w += wi;
          for (let c = 0; c < 3; c++) sum[c] += level.rgb[i * 3 + c] * wi;
        }
      }
      const o = y * width + x;
      weight[o] = Math.min(1, w);
      for (let c = 0; c < 3; c++) rgb[o * 3 + c] = w > 0 ? sum[c] / w : 0;
    }
  }
  return { width, height, rgb, weight };
}

function pullUp(fine: Level, coarse: Level) {
  for (let y = 0; y < fine.height; y++) {
    for (let x = 0; x < fine.width; x++) {
      const i = y * fine.width + x;
      const w = fine.weight[i];
      if (w >= 1) continue;
      // Kaba seviyeden çift doğrusal (bilinear) örnekleme
      const cx = Math.min(Math.max((x + 0.5) / 2 - 0.5, 0), coarse.width - 1);
      const cy = Math.min(Math.max((y + 0.5) / 2 - 0.5, 0), coarse.height - 1);
      const x0 = Math.floor(cx);
      const y0 = Math.floor(cy);
      const x1 = Math.min(x0 + 1, coarse.width - 1);
      const y1 = Math.min(y0 + 1, coarse.height - 1);
      const fx = cx - x0;
      const fy = cy - y0;
      for (let c = 0; c < 3; c++) {
        const at = (px: number, py: number) => coarse.rgb[(py * coarse.width + px) * 3 + c];
        const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx;
        const bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx;
        const value = top * (1 - fy) + bottom * fy;
        fine.rgb[i * 3 + c] = fine.rgb[i * 3 + c] * w + value * (1 - w);
      }
      fine.weight[i] = 1;
    }
  }
}

// Maskelenen nesneyi saydam arka planlı PNG olarak keser (sınırlarına kırpılmış).
export async function cutout(image: ImageData, mask: BinaryMask, invert = false): Promise<Blob> {
  const { width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const out = new ImageData(new Uint8ClampedArray(image.data), width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const keep = invert ? !mask.data[i] : !!mask.data[i];
      out.data[i * 4 + 3] = keep ? 255 : 0;
      if (keep) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) throw new Error('Seçili alan boş');
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d')!.putImageData(out, 0, 0);
  const cropped = new OffscreenCanvas(maxX - minX + 1, maxY - minY + 1);
  cropped.getContext('2d')!.drawImage(canvas, -minX, -minY);
  return cropped.convertToBlob({ type: 'image/png' });
}

// Maskenin dışını saydam yapar; görsel boyutu korunur (kırpmadan).
export function applyAlpha(image: ImageData, mask: BinaryMask): ImageData {
  const out = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  for (let i = 0; i < mask.data.length; i++) if (!mask.data[i]) out.data[i * 4 + 3] = 0;
  return out;
}

export async function imageDataToBlob(image: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
