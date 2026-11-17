import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
import type { Mask } from '../render/compositor';

// Person segmentation (MediaPipe Selfie Segmenter); shared by the main thread and the worker.
export const SELFIE_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
export const MASK_WIDTH = 256;

export async function withGpuFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await create('GPU');
  } catch {
    return create('CPU');
  }
}

export function createSelfieSegmenter(files: WasmFileset, canvas?: OffscreenCanvas) {
  return withGpuFallback((delegate) =>
    ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: SELFIE_MODEL, delegate },
      canvas,
      runningMode: 'VIDEO',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
  );
}

// Downscales and segments a frame; MediaPipe needs increasing timestamps (ms).
export function segmentFrame(
  segmenter: ImageSegmenter,
  work: OffscreenCanvas,
  source: CanvasImageSource,
  width: number,
  height: number,
  timestamp: number,
): Mask {
  const h = Math.max(1, Math.round((MASK_WIDTH * height) / width));
  work.width = MASK_WIDTH;
  work.height = h;
  work.getContext('2d')!.drawImage(source, 0, 0, MASK_WIDTH, h);
  const result = segmenter.segmentForVideo(work, timestamp);
  const floats = result.confidenceMasks?.[0]?.getAsFloat32Array() ?? new Float32Array(MASK_WIDTH * h).fill(1);
  const data = new Uint8Array(floats.length);
  for (let i = 0; i < floats.length; i++) data[i] = floats[i] * 255;
  result.close();
  return { data, width: MASK_WIDTH, height: h };
}
