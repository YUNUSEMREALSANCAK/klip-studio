import { FaceDetector, FilesetResolver, type ImageSegmenter } from '@mediapipe/tasks-vision';
import type { Mask } from '../render/compositor';
import { createSelfieSegmenter, MASK_WIDTH, segmentFrame, withGpuFallback } from './segmenter';

// Modeller Google'ın herkese açık model deposundan bir kez indirilir, sonra tarayıcı önbelleğinden gelir.
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
const getFileset = () => (fileset ??= FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe-wasm`));

// Önizleme için ana iş parçacığında çalışan ayırıcı; her örnek kendi zaman damgası sayacını tutar.
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

  // Model yüklendiyse senkron çalışır; önizleme döngüsü için. Yüklenmediyse null.
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
