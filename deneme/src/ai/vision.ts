import { FaceDetector, FilesetResolver, type ImageSegmenter } from '@mediapipe/tasks-vision';
import type { Mask } from '../render/compositor';
import { createSelfieSegmenter, MASK_WIDTH, segmentFrame, withGpuFallback } from './segmenter';

// Models are downloaded once from Google's public model storage, then served from the browser cache.
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
const getFileset = () => (fileset ??= FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe-wasm`));

// Main-thread segmenter for the preview; each instance keeps its own timestamp counter.
export class BackgroundRemover {
  private segmenter: Promise<ImageSegmenter>;
  private loaded: ImageSegmenter | null = null;
  private canvas = new OffscreenCanvas(MASK_WIDTH, MASK_WIDTH);
  private clock = 0;

  constructor() {
    this.segmenter = getFileset().then((files) => createSelfieSegmenter(files));
    void this.segmenter.then((s) => (this.loaded = s));
  }

  async segment(source: TexImageSource, width: number, height: number): Promise<Mask> {
    return segmentFrame(await this.segmenter, this.canvas, source as CanvasImageSource, width, height, (this.clock += 33));
  }

  // Runs synchronously once the model is loaded, for the preview loop. Returns null otherwise.
  segmentIfReady(source: TexImageSource, width: number, height: number): Mask | null {
    return this.loaded ? segmentFrame(this.loaded, this.canvas, source as CanvasImageSource, width, height, (this.clock += 33)) : null;
  }
}

let faceDetector: Promise<FaceDetector> | null = null;

export function getFaceDetector() {
  faceDetector ??= getFileset().then((files) =>
    withGpuFallback((delegate) =>
      FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      }),
    ),
  );
  return faceDetector;
}
