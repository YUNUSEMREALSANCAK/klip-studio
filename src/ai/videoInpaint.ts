import {
  ALL_FORMATS,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny';
import { sourceSpan } from '../core/timeline';
import type { Asset, MediaClip } from '../core/types';
import { decodeAssetAudio } from '../media/audio';
import { createAsset } from '../media/importMedia';
import { dilate, inpaint, type BinaryMask, type SamClient, type SamPoint } from './objectTools';

const MAX_WIDTH = 1280;
const SAMPLE_FPS = 6; // nesne takibi için saniyede kaç karede SAM çalışır

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function resample(mask: BinaryMask, width: number, height: number): BinaryMask {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.floor((y * mask.height) / height);
    for (let x = 0; x < width; x++) data[y * width + x] = mask.data[sy * mask.width + Math.floor((x * mask.width) / width)];
  }
  return { data, width, height };
}

const area = (mask: BinaryMask) => mask.data.reduce((sum, v) => sum + v, 0);

// Önceki maskenin içinden, sonraki karede nesneyi işaretleyecek birkaç pozitif nokta seçer.
function promptPoints(mask: BinaryMask): SamPoint[] {
  const { data, width, height } = mask;
  let sx = 0;
  let sy = 0;
  let n = 0;
  let minX = width;
  let maxX = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (!data[y * width + x]) continue;
      sx += x;
      sy += y;
      n++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  if (!n) return [];
  const cy = Math.round(sy / n);
  const candidates = [sx / n, minX + (maxX - minX) * 0.25, minX + (maxX - minX) * 0.75].map(Math.round);
  return candidates
    .filter((x) => data[cy * width + x])
    .map((x) => ({ x: x / width, y: cy / height, positive: true }));
}

async function frameImage(sink: CanvasSink, time: number, width: number, height: number): Promise<ImageData> {
  const frame = await sink.getCanvas(time);
  if (!frame) throw new Error('Kare okunamadı');
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(frame.canvas, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Seçilen nesneyi klibin tamamında takip edip siler; sonuç yeni bir video varlığıdır.
export async function removeObjectFromVideo(
  clip: MediaClip,
  asset: Asset,
  sam: SamClient,
  referenceMask: BinaryMask,
  referenceTime: number, // kaynak saniyesi
  onProgress: (message: string, progress: number) => void,
): Promise<Asset> {
  const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('Video izi bulunamadı');
  const width = even(Math.min(MAX_WIDTH, track.displayWidth));
  const height = even((width * track.displayHeight) / track.displayWidth);
  const sink = new CanvasSink(track, { width, height, fit: 'fill' });
  const from = clip.in;
  const to = Math.min(asset.duration, clip.in + sourceSpan(clip));

  // 1) Takip: örnek karelerde maske çıkar, referans kareden ileri ve geri yayılarak.
  const times: number[] = [];
  for (let t = from; t < to; t += 1 / SAMPLE_FPS) times.push(t);
  const ref = times.reduce((best, t, i) => (Math.abs(t - referenceTime) < Math.abs(times[best] - referenceTime) ? i : best), 0);
  const masks: BinaryMask[] = [];
  masks[ref] = resample(referenceMask, width, height);
  let done = 1;
  const trackDirection = async (step: 1 | -1) => {
    for (let i = ref + step; i >= 0 && i < times.length; i += step) {
      const previous = masks[i - step];
      const points = promptPoints(previous);
      let mask = previous;
      if (points.length) {
        const candidate = resample(await sam.segment(await frameImage(sink, times[i], width, height), points), width, height);
        const ratio = area(candidate) / Math.max(area(previous), 1);
        // Maske birden çok büyür/küçülürse takip kaymıştır; önceki maskeyi koru.
        if (ratio > 0.33 && ratio < 3) mask = candidate;
      }
      masks[i] = mask;
      onProgress('Nesne karelerde takip ediliyor', (++done / times.length) * 0.5);
    }
  };
  await trackDirection(1);
  await trackDirection(-1);
  const grown = masks.map((m) => dilate(m, 5));

  // 2) Doldurma ve kodlama: her kare en yakın örnek karenin maskesiyle temizlenir.
  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
  if (!videoCodec) throw new Error('Video kodlama desteklenmiyor');
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY_HIGH });
  output.addVideoTrack(videoSource);
  const audioCodec = asset.hasAudio ? await getFirstEncodableAudioCodec(['aac', 'opus']) : null;
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  for await (const frame of sink.canvases(from, to)) {
    ctx.drawImage(frame.canvas, 0, 0, width, height);
    const index = Math.min(times.length - 1, Math.max(0, Math.round((frame.timestamp - from) * SAMPLE_FPS)));
    const cleaned = inpaint(ctx.getImageData(0, 0, width, height), grown[index]);
    ctx.putImageData(cleaned, 0, 0);
    await videoSource.add(frame.timestamp - from, frame.duration);
    onProgress('Kareler temizleniyor', 0.5 + ((frame.timestamp - from) / (to - from)) * 0.5);
  }

  if (audioSource) {
    const audio = await decodeAssetAudio(asset);
    const start = Math.floor(from * audio.sampleRate);
    const length = Math.max(1, Math.floor((to - from) * audio.sampleRate));
    const segment = new AudioBuffer({ length, sampleRate: audio.sampleRate, numberOfChannels: audio.numberOfChannels });
    for (let ch = 0; ch < audio.numberOfChannels; ch++) segment.copyToChannel(audio.getChannelData(ch).subarray(start, start + length), ch);
    await audioSource.add(segment);
  }
  await output.finalize();
  return createAsset(new Blob([target.buffer!], { type: 'video/mp4' }), `${asset.name} (nesne silindi).mp4`);
}
