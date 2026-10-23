import type { Mask } from '../render/compositor';
import type { MatteMessage, MatteRequest } from './matte.worker';
import { BackgroundRemover } from './vision';

// Dışa aktarma için kişi ayırıcı: worker'da çalışır; worker kurulamazsa ana iş parçacığına düşer.
export class WorkerBackgroundRemover {
  private worker = new Worker(new URL('./matte.worker.ts', import.meta.url), { type: 'module' });
  private nextId = 1;
  private pending = new Map<number, { resolve: (mask: Mask) => void; reject: (error: Error) => void }>();
  private fallback: BackgroundRemover | null = null;

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<MatteMessage>) => {
      const job = this.pending.get(data.id);
      if (!job) return;
      this.pending.delete(data.id);
      if (data.error || !data.mask) job.reject(new Error(data.error ?? 'Maske üretilemedi'));
      else job.resolve({ data: data.mask, width: data.width!, height: data.height! });
    };
  }

  async segment(source: TexImageSource, width: number, height: number): Promise<Mask> {
    if (this.fallback) return this.fallback.segment(source, width, height);
    try {
      const frame = await createImageBitmap(source as ImageBitmapSource);
      const id = this.nextId++;
      return await new Promise<Mask>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        const request: MatteRequest = { id, frame };
        this.worker.postMessage(request, [frame]);
      });
    } catch (error) {
      console.warn("Kişi ayırma worker'da başlatılamadı; ana iş parçacığında devam ediliyor.", error);
      this.dispose();
      this.fallback = new BackgroundRemover();
      return this.fallback.segment(source, width, height);
    }
  }

  dispose() {
    this.worker.terminate();
  }
}
