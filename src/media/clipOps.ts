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
  type WrappedCanvas,
} from 'mediabunny';
import { sourceSpan } from '../core/timeline';
import type { Asset, MediaClip } from '../core/types';
import { decodeAssetAudio } from './audio';
import { createAsset } from './importMedia';

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

async function videoTrackOf(asset: Asset) {
  const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('Video izi bulunamadı');
  return track;
}

// Kaynaktaki bir kareyi PNG görsel varlığı olarak yakalar ("kareyi dondur").
export async function captureFrame(asset: Asset, sourceTime: number): Promise<Asset> {
  const frame = await new CanvasSink(await videoTrackOf(asset)).getCanvas(sourceTime);
  if (!frame) throw new Error('Kare okunamadı');
  const canvas = new OffscreenCanvas(frame.canvas.width, frame.canvas.height);
  canvas.getContext('2d')!.drawImage(frame.canvas, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return createAsset(blob, `${asset.name} (kare ${sourceTime.toFixed(1)} sn).png`);
}

// Klibin kaynak aralığını tersten oynayan yeni bir video varlığı üretir.
// Bellek taşmasın diye kareler 1 sn'lik parçalar hâlinde, sondan başa doğru çözülür.
export async function reverseClip(clip: MediaClip, asset: Asset, onProgress: (p: number) => void): Promise<Asset> {
  const track = await videoTrackOf(asset);
  const width = even(track.displayWidth);
  const height = even(track.displayHeight);
  const from = clip.in;
  const to = Math.min(asset.duration, clip.in + sourceSpan(clip));

  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
  if (!videoCodec) throw new Error('Video kodlama desteklenmiyor');
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY_HIGH });
  output.addVideoTrack(videoSource);

  let audio: AudioBuffer | null = null;
  const audioCodec = asset.hasAudio ? await getFirstEncodableAudioCodec(['aac', 'opus']) : null;
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null;
  if (audioSource) {
    output.addAudioTrack(audioSource);
    audio = reverseAudio(await decodeAssetAudio(asset), from, to);
  }
  await output.start();

  const sink = new CanvasSink(track, { width, height, fit: 'fill' });
  const total = to - from;
  let time = 0;
  for (let chunkEnd = to; chunkEnd > from + 1e-3; chunkEnd -= 1) {
    const chunkStart = Math.max(from, chunkEnd - 1);
    const frames: WrappedCanvas[] = [];
    for await (const frame of sink.canvases(chunkStart, chunkEnd)) frames.push(frame);
    for (const frame of frames.reverse()) {
      ctx.drawImage(frame.canvas, 0, 0, width, height);
      await videoSource.add(time, frame.duration);
      time += frame.duration;
    }
    onProgress(Math.min(1, (to - chunkStart) / total));
  }
  if (audio && audioSource) await audioSource.add(audio);
  await output.finalize();
  return createAsset(new Blob([target.buffer!], { type: 'video/mp4' }), `${asset.name} (ters).mp4`);
}

function reverseAudio(buffer: AudioBuffer, from: number, to: number): AudioBuffer {
  const start = Math.floor(from * buffer.sampleRate);
  const length = Math.max(1, Math.floor((to - from) * buffer.sampleRate));
  const out = new AudioBuffer({ length, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch).slice(start, start + length).reverse();
    out.copyToChannel(data, ch);
  }
  return out;
}
