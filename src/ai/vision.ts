import { FaceDetector, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { Mask } from '../render/compositor';

// Modeller Google'ın herkese açık model deposundan bir kez indirilir, sonra tarayıcı önbelleğinden gelir.
const SELFIE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

const MASK_WIDTH = 256;

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
const getFileset = () => (fileset ??= FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe-wasm`));

async function withGpuFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await create('GPU');
  } catch {
    return create('CPU');
  }
}

// Her örnek kendi zaman damgası sayacını tutar; MediaPipe artan zaman damgası ister.
export class BackgroundRemover {
  private segmenter: Promise<ImageSegmenter>;
  private loaded: ImageSegmenter | null = null;
  private canvas = new OffscreenCanvas(MASK_WIDTH, MASK_WIDTH);
  private clock = 0;

  constructor() {
    this.segmenter = getFileset().then((files) =>
      withGpuFallback((delegate) =>
        ImageSegmenter.createFromOptions(files, {
          baseOptions: { modelAssetPath: SELFIE_MODEL, delegate },
          runningMode: 'VIDEO',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
      ),
    );
    void this.segmenter.then((s) => (this.loaded = s));
  }

  ready() {
    return this.segmenter.then(() => undefined);
  }

  async segment(source: TexImageSource, width: number, height: number): Promise<Mask> {
    const segmenter = await this.segmenter;
    return this.segmentSync(segmenter, source, width, height);
  }

  // Model yüklendiyse senkron çalışır; önizleme döngüsü için. Yüklenmediyse null.
  segmentIfReady(source: TexImageSource, width: number, height: number): Mask | null {
    return this.loaded ? this.segmentSync(this.loaded, source, width, height) : null;
  }

  private segmentSync(segmenter: ImageSegmenter, source: TexImageSource, width: number, height: number): Mask {
    const h = Math.max(1, Math.round((MASK_WIDTH * height) / width));
    this.canvas.width = MASK_WIDTH;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d')!;
    ctx.drawImage(source as CanvasImageSource, 0, 0, MASK_WIDTH, h);
    this.clock += 33;
    const result = segmenter.segmentForVideo(this.canvas, this.clock);
    const mask = result.confidenceMasks?.[0];
    const floats = mask?.getAsFloat32Array() ?? new Float32Array(MASK_WIDTH * h).fill(1);
    const data = new Uint8Array(floats.length);
    for (let i = 0; i < floats.length; i++) data[i] = floats[i] * 255;
    result.close();
    return { data, width: MASK_WIDTH, height: h };
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
