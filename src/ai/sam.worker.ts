/// <reference lib="webworker" />
import { AutoProcessor, RawImage, SamModel, Tensor, type Processor } from '@huggingface/transformers';

// Segment Anything'in tarayıcıya uygun küçültülmüş sürümü (~40 MB).
const MODEL_ID = 'Xenova/slimsam-77-uniform';

export type SamRequest =
  | { type: 'embed'; image: ImageData }
  | { type: 'decode'; points: { x: number; y: number; positive: boolean }[] };

export type SamMessage =
  | { type: 'progress'; message: string; progress: number }
  | { type: 'embedded' }
  | { type: 'mask'; mask: Uint8Array; width: number; height: number; score: number }
  | { type: 'error'; message: string };

type ModelInputs = Record<string, Tensor> & { original_sizes: number[][]; reshaped_input_sizes: number[][] };

const post = (message: SamMessage, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
const hasWebGpu = 'gpu' in navigator;

let model: Promise<{ model: SamModel; processor: Processor }> | null = null;
let current: { inputs: ModelInputs; embeddings: Record<string, Tensor> } | null = null;

function loadModel() {
  model ??= (async () => {
    const files = new Map<string, number>();
    const progress_callback = (info: { status: string; file?: string; progress?: number }) => {
      if (info.status !== 'progress' || !info.file) return;
      files.set(info.file, info.progress ?? 0);
      const average = [...files.values()].reduce((a, b) => a + b, 0) / files.size;
      post({ type: 'progress', message: 'Nesne seçme modeli indiriliyor', progress: average / 100 });
    };
    const [samModel, processor] = await Promise.all([
      SamModel.from_pretrained(MODEL_ID, {
        device: hasWebGpu ? 'webgpu' : 'wasm',
        dtype: hasWebGpu ? 'fp32' : 'q8',
        progress_callback,
      }),
      AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
    ]);
    return { model: samModel as SamModel, processor };
  })();
  return model;
}

async function embed(image: ImageData) {
  const { model: sam, processor } = await loadModel();
  post({ type: 'progress', message: 'Görsel analiz ediliyor', progress: -1 });
  const raw = new RawImage(new Uint8ClampedArray(image.data), image.width, image.height, 4);
  const inputs = (await processor(raw)) as ModelInputs;
  const embeddings = (await sam.get_image_embeddings(inputs as never)) as unknown as Record<string, Tensor>;
  current = { inputs, embeddings };
  post({ type: 'embedded' });
}

async function decode(points: { x: number; y: number; positive: boolean }[]) {
  if (!current) throw new Error('Önce görsel yüklenmeli');
  const { model: sam, processor } = await loadModel();
  const [height, width] = current.inputs.reshaped_input_sizes[0];
  const input_points = new Tensor('float32', points.flatMap((p) => [p.x * width, p.y * height]), [1, 1, points.length, 2]);
  const input_labels = new Tensor('int64', points.map((p) => BigInt(p.positive ? 1 : 0)), [1, 1, points.length]);
  const outputs = (await sam({ ...current.embeddings, input_points, input_labels })) as {
    pred_masks: Tensor;
    iou_scores: Tensor;
  };
  const masks = (await (processor as unknown as { post_process_masks: Function }).post_process_masks(
    outputs.pred_masks,
    current.inputs.original_sizes,
    current.inputs.reshaped_input_sizes,
  )) as Tensor[];

  // Üç aday maske içinden en yüksek puanlıyı seç.
  const scores = outputs.iou_scores.data as Float32Array;
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  const [, , maskHeight, maskWidth] = masks[0].dims;
  const size = maskWidth * maskHeight;
  const mask = new Uint8Array((masks[0].data as Uint8Array).subarray(best * size, (best + 1) * size));
  post({ type: 'mask', mask, width: maskWidth, height: maskHeight, score: scores[best] }, [mask.buffer]);
}

self.onmessage = async ({ data }: MessageEvent<SamRequest>) => {
  try {
    if (data.type === 'embed') await embed(data.image);
    else await decode(data.points);
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
