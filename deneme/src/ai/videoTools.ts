import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';
import { sourceSpan } from '../core/timeline';
import type { Asset, FilterSettings, MediaClip, ReframeTrack } from '../core/types';
import { getFaceDetector } from './vision';

type FrameCallback = (canvas: HTMLCanvasElement | OffscreenCanvas, time: number) => void | Promise<void>;

// Walks small frames across the clip's source range at a fixed interval.
async function sampleFrames(
  asset: Asset,
  clip: MediaClip,
  every: number,
  size: { width: number; height: number },
  onFrame: FrameCallback,
  onProgress?: (p: number) => void,
) {
  const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('No video track found');
  const sink = new CanvasSink(track, { ...size, fit: 'fill', poolSize: 1 });
  let next = clip.in;
  const span = sourceSpan(clip);
  const end = clip.in + span;
  for await (const frame of sink.canvases(clip.in, end)) {
    if (frame.timestamp + 1e-3 < next) continue;
    await onFrame(frame.canvas, frame.timestamp);
    onProgress?.((frame.timestamp - clip.in) / span);
    next = frame.timestamp + every;
  }
}

function pixels(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

// Finds scene cuts from the color difference between consecutive frames. Returns timeline seconds.
export async function detectScenes(asset: Asset, clip: MediaClip, onProgress: (p: number) => void): Promise<number[]> {
  const cuts: number[] = [];
  const history: number[] = [];
  let previous: Uint8ClampedArray | null = null;
  await sampleFrames(
    asset,
    clip,
    0.1,
    { width: 48, height: 27 },
    (canvas, time) => {
      const current = new Uint8ClampedArray(pixels(canvas));
      if (previous) {
        let diff = 0;
        for (let i = 0; i < current.length; i += 4) {
          diff += Math.abs(current[i] - previous[i]) + Math.abs(current[i + 1] - previous[i + 1]) + Math.abs(current[i + 2] - previous[i + 2]);
        }
        diff /= (current.length / 4) * 3;
        const recent = history.slice(-10);
        const mean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : diff;
        const lastCut = cuts[cuts.length - 1] ?? -Infinity;
        const timelineTime = clip.start + (time - clip.in) / clip.speed;
        if (diff > 30 && diff > mean * 2.5 && timelineTime - lastCut > 0.8) cuts.push(timelineTime);
        history.push(diff);
      }
      previous = current;
    },
    onProgress,
  );
  return cuts.filter((t) => t > clip.start + 0.3 && t < clip.start + clip.duration - 0.3);
}

// Tracks faces to produce a horizontal focus point for a vertical (9:16) crop.
export async function computeReframe(asset: Asset, clip: MediaClip, onProgress: (p: number) => void): Promise<ReframeTrack> {
  const detector = await getFaceDetector();
  const width = 320;
  const height = Math.round((width * asset.height) / asset.width);
  const times: number[] = [];
  const raw: number[] = [];
  let last = 0.5;
  await sampleFrames(
    asset,
    clip,
    0.4,
    { width, height },
    (canvas, time) => {
      const result = detector.detect(canvas as unknown as HTMLCanvasElement);
      const faces = result.detections
        .map((d) => d.boundingBox)
        .filter((b): b is NonNullable<typeof b> => !!b)
        .sort((a, b) => b.width * b.height - a.width * a.height);
      if (faces[0]) last = (faces[0].originX + faces[0].width / 2) / width;
      times.push(time);
      raw.push(last);
    },
    onProgress,
  );
  // Smooth with a moving average so the virtual camera doesn't shake.
  const centers = raw.map((_, i) => {
    const window = raw.slice(Math.max(0, i - 3), i + 4);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
  return { times, centers };
}

// Balances brightness, contrast and saturation from the middle frame.
export async function autoEnhance(asset: Asset, clip: MediaClip): Promise<Partial<FilterSettings>> {
  let stats = { mean: 0.5, std: 0.22, saturation: 0.35 };
  const capture = (data: Uint8ClampedArray) => {
    let sum = 0;
    let sumSq = 0;
    let sat = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += l;
      sumSq += l * l;
      sat += Math.max(r, g, b) - Math.min(r, g, b);
    }
    const mean = sum / n;
    stats = { mean, std: Math.sqrt(sumSq / n - mean * mean), saturation: sat / n };
  };

  if (asset.kind === 'image') {
    const image = await createImageBitmap(asset.file);
    const canvas = new OffscreenCanvas(96, 54);
    canvas.getContext('2d')!.drawImage(image, 0, 0, 96, 54);
    capture(pixels(canvas));
  } else {
    const middle = { ...clip, in: clip.in + sourceSpan(clip) / 2, duration: 0.2, speed: 1 };
    await sampleFrames(asset, middle, 1, { width: 96, height: 54 }, (canvas) => capture(new Uint8ClampedArray(pixels(canvas))));
  }
  const clamp = (v: number) => Math.round(Math.max(-0.5, Math.min(0.5, v)) * 100) / 100;
  return {
    brightness: clamp((0.48 - stats.mean) * 1.2),
    contrast: clamp((0.22 - stats.std) * 2),
    saturation: clamp((0.3 - stats.saturation) * 1.2),
    sharpen: 0.25,
  };
}
