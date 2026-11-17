import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';
import { uid } from '../core/timeline';
import type { Asset, AssetKind } from '../core/types';

function kindOf(file: Blob): AssetKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  return null;
}

// An image is its own thumbnail; other thumbnails are generated on import.
export const thumbnailOf = (asset: Asset) => asset.thumbnail ?? (asset.kind === 'image' ? asset.url : undefined);

export async function importFile(file: File): Promise<Asset> {
  return createAsset(file, file.name);
}

export async function createAsset(file: Blob, name: string): Promise<Asset> {
  const kind = kindOf(file);
  if (!kind) throw new Error(`Unsupported file type: ${name}`);
  const url = URL.createObjectURL(file);
  const base = { id: uid(), name, kind, file, url };

  if (kind === 'image') {
    const image = await loadImage(url);
    return {
      ...base,
      duration: Infinity,
      width: image.naturalWidth,
      height: image.naturalHeight,
      hasAudio: false,
    };
  }

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const duration = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = await input.getPrimaryAudioTrack();
  let thumbnail: string | undefined;
  if (videoTrack) {
    const sink = new CanvasSink(videoTrack, { width: 160, height: 90, fit: 'cover' });
    const frame = await sink.getCanvas(Math.min(0.5, duration / 2));
    if (frame) thumbnail = await canvasToDataUrl(frame.canvas);
  }
  return {
    ...base,
    kind: videoTrack ? 'video' : 'audio',
    duration,
    width: videoTrack?.displayWidth ?? 0,
    height: videoTrack?.displayHeight ?? 0,
    hasAudio: !!audioTrack,
    thumbnail,
  };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = url;
  });
}

// Always produces a data URL so thumbnails can be persisted with the project.
async function canvasToDataUrl(canvas: HTMLCanvasElement | OffscreenCanvas) {
  if (canvas instanceof HTMLCanvasElement) return canvas.toDataURL('image/jpeg', 0.7);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
