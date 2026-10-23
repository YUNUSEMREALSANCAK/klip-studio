import type { RifeMessage, RifeRequest } from './rife.worker';

const MAX_WIDTH = 960;
const align = (n: number) => Math.max(32, Math.round(n / 32) * 32); // model 32'nin katı boyut ister

// Dışa aktarmada yapay zeka ile ara kare üreten istemci.
export class FrameInterpolator {
  private worker = new Worker(new URL('./rife.worker.ts', import.meta.url), { type: 'module' });
  private nextId = 1;
  private pending = new Map<number, { resolve: (frame: Uint8ClampedArray) => void; reject: (e: Error) => void }>();
  private canvas = new OffscreenCanvas(32, 32);
  onProgress: (progress: number) => void = () => {};

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<RifeMessage>) => {
      if (data.type === 'progress') return this.onProgress(data.progress);
      const job = this.pending.get(data.id);
      if (!job) return;
      this.pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.message));
      else job.resolve(data.frame);
    };
  }

  private pixels(source: CanvasImageSource, width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  }

  // a ile b arasında t (0..1) konumundaki kareyi üretir; sonuç bir tuvaldir.
  async interpolate(a: CanvasImageSource, b: CanvasImageSource, sourceWidth: number, sourceHeight: number, t: number): Promise<OffscreenCanvas> {
    const width = align(Math.min(MAX_WIDTH, sourceWidth));
    const height = align((width * sourceHeight) / sourceWidth);
    const request: RifeRequest = { id: this.nextId++, a: this.pixels(a, width, height), b: this.pixels(b, width, height), width, height, t };
    const frame = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      this.pending.set(request.id, { resolve, reject });
      this.worker.postMessage(request, [request.a.buffer, request.b.buffer]);
    });
    const out = new OffscreenCanvas(width, height);
    out.getContext('2d')!.putImageData(new ImageData(frame as ImageDataArray, width, height), 0, 0);
    return out;
  }

  dispose() {
    this.worker.terminate();
  }
}
