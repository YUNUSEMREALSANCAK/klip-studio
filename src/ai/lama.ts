import { dilate, type BinaryMask } from './objectTools';
import type { LamaMessage, LamaRequest } from './lama.worker';

const SIZE = 512;
type Report = (message: string, progress: number) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (image: Uint8ClampedArray) => void; reject: (e: Error) => void; report: Report }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./lama.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<LamaMessage>) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.type === 'progress') return job.report(data.message, data.progress);
      pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.message));
      else job.resolve(data.image);
    };
  }
  return worker;
}

function run(image: Uint8ClampedArray, mask: Uint8Array, report: Report) {
  const id = nextId++;
  return new Promise<Uint8ClampedArray>((resolve, reject) => {
    pending.set(id, { resolve, reject, report });
    const request: LamaRequest = { id, image, mask };
    getWorker().postMessage(request, [image.buffer, mask.buffer]);
  });
}

// Crops a region around the mask, fills it with LaMa and writes back only the masked pixels.
export async function inpaintLama(image: ImageData, mask: BinaryMask, report: Report = () => {}): Promise<ImageData> {
  const { width, height } = image;
  const grown = dilate(mask, 6);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grown.data[y * width + x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return image;

  // Crop area expanded to include enough context around the object.
  const side = (n: number, limit: number) => Math.min(limit, Math.max(256, Math.round(n * 1.8)));
  const cw = side(maxX - minX + 1, width);
  const ch = side(maxY - minY + 1, height);
  const cx = Math.min(Math.max(Math.round((minX + maxX) / 2 - cw / 2), 0), width - cw);
  const cy = Math.min(Math.max(Math.round((minY + maxY) / 2 - ch / 2), 0), height - ch);

  const source = new OffscreenCanvas(width, height);
  source.getContext('2d')!.putImageData(image, 0, 0);
  const crop = new OffscreenCanvas(SIZE, SIZE);
  const cropCtx = crop.getContext('2d', { willReadFrequently: true })!;
  cropCtx.drawImage(source, cx, cy, cw, ch, 0, 0, SIZE, SIZE);
  const cropPixels = cropCtx.getImageData(0, 0, SIZE, SIZE).data;
  const cropMask = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const sy = cy + Math.floor((y * ch) / SIZE);
    for (let x = 0; x < SIZE; x++) cropMask[y * SIZE + x] = grown.data[sy * width + cx + Math.floor((x * cw) / SIZE)];
  }

  const filled = await run(new Uint8ClampedArray(cropPixels), cropMask, report);
  cropCtx.putImageData(new ImageData(filled as ImageDataArray, SIZE, SIZE), 0, 0);
  const back = new OffscreenCanvas(cw, ch);
  const backCtx = back.getContext('2d', { willReadFrequently: true })!;
  backCtx.drawImage(crop, 0, 0, cw, ch);
  const patch = backCtx.getImageData(0, 0, cw, ch).data;

  const out = new ImageData(new Uint8ClampedArray(image.data), width, height);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (cy + y) * width + cx + x;
      if (!grown.data[i]) continue;
      const p = (y * cw + x) * 4;
      out.data[i * 4] = patch[p];
      out.data[i * 4 + 1] = patch[p + 1];
      out.data[i * 4 + 2] = patch[p + 2];
    }
  }
  return out;
}
