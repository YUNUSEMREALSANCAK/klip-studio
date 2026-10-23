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
  type InputVideoTrack,
  type WrappedCanvas,
} from 'mediabunny';
import { WorkerBackgroundRemover } from '../ai/matteClient';
import { clipEnd, projectDuration } from '../core/timeline';
import type { Asset, MediaClip, Project, TextClip } from '../core/types';
import { ensureFonts } from '../render/fonts';
import { mixTimelineAudio } from '../media/audio';
import { Compositor, type Mask } from '../render/compositor';
import { clipSourceTime, clipsToDraw, composeFrame, drawTexts, visibleClips, type VisualSource } from '../render/composeFrame';

// Bir klibin karelerini sırayla, gerektiğinde ileri sararak okur.
class FrameReader {
  private iterator: AsyncGenerator<WrappedCanvas> | null = null;
  private current: WrappedCanvas | null = null;
  private pending: WrappedCanvas | null = null;

  constructor(private sink: CanvasSink) {}

  async frameAt(time: number) {
    if (!this.iterator || (this.current && time < this.current.timestamp - 0.001)) {
      await this.iterator?.return(undefined);
      this.iterator = this.sink.canvases(time);
      this.current = this.pending = null;
    }
    while (true) {
      if (!this.pending) {
        const step = await this.iterator.next();
        if (step.done) break;
        this.pending = step.value;
      }
      if (this.pending.timestamp > time + 1e-4 && this.current) break;
      this.current = this.pending;
      this.pending = null;
    }
    return this.current;
  }

  // Bekleyen (sonraki) kare ve iki kare arasındaki konum; kare harmanlama için.
  blendAt(time: number) {
    if (!this.current || !this.pending) return null;
    const span = this.pending.timestamp - this.current.timestamp;
    if (span <= 0) return null;
    return { source: this.pending.canvas, weight: Math.min(1, Math.max(0, (time - this.current.timestamp) / span)) };
  }

  async close() {
    await this.iterator?.return(undefined);
  }
}

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  onProgress: (progress: number) => void;
  signal?: AbortSignal;
}

export async function exportVideo(project: Project, assets: Record<string, Asset>, options: ExportOptions): Promise<Blob> {
  const { width, height, fps } = options;
  const duration = projectDuration(project.clips);
  if (duration <= 0) throw new Error('Zaman çizelgesi boş');

  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
  if (!videoCodec) throw new Error('Tarayıcınız video kodlamayı desteklemiyor (WebCodecs)');
  const audioCodec = await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: 48000 });

  await ensureFonts(project.clips.filter((c): c is TextClip => c.type === 'text'));
  const glCanvas = new OffscreenCanvas(width, height);
  const compositor = new Compositor(glCanvas, width, height);
  const frameCanvas = new OffscreenCanvas(width, height);
  const ctx = frameCanvas.getContext('2d')!;

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const videoSource = new CanvasSource(frameCanvas, { codec: videoCodec, quality: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: fps });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  const tracks = new Map<string, Promise<InputVideoTrack | null>>();
  const readers = new Map<string, FrameReader>();
  const images = new Map<string, Promise<ImageBitmap>>();
  const remover = project.clips.some((c) => c.type === 'media' && c.removeBackground) ? new WorkerBackgroundRemover() : null;

  const videoTrack = (asset: Asset) => {
    if (!tracks.has(asset.id)) {
      const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
      tracks.set(asset.id, input.getPrimaryVideoTrack());
    }
    return tracks.get(asset.id)!;
  };

  const loadSource = async (clip: MediaClip, t: number): Promise<VisualSource | undefined> => {
    const asset = assets[clip.assetId];
    if (asset.kind === 'image') {
      if (!images.has(asset.id)) images.set(asset.id, createImageBitmap(asset.file));
      const bitmap = await images.get(asset.id)!;
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
    if (!readers.has(clip.id)) {
      const track = await videoTrack(asset);
      if (!track) return undefined;
      readers.set(clip.id, new FrameReader(new CanvasSink(track)));
    }
    const reader = readers.get(clip.id)!;
    const time = clipSourceTime(clip, t, assets);
    const frame = await reader.frameAt(time);
    if (!frame) return undefined;
    const blend = clip.smoothSlowMo && clip.speed < 1 ? reader.blendAt(time) : null;
    return { source: frame.canvas, width: frame.canvas.width, height: frame.canvas.height, blend: blend ?? undefined };
  };

  const totalFrames = Math.ceil(duration * fps);
  for (let i = 0; i < totalFrames; i++) {
    if (options.signal?.aborted) {
      await output.cancel();
      throw new DOMException('İptal edildi', 'AbortError');
    }
    const t = i / fps;
    const visible = visibleClips(project.clips, assets, t);
    const sources = new Map<string, VisualSource>();
    const masks = new Map<string, Mask>();
    for (const clip of clipsToDraw(visible)) {
      const source = await loadSource(clip, t);
      if (!source) continue;
      sources.set(clip.id, source);
      if (clip.removeBackground && remover) masks.set(clip.id, await remover.segment(source.source, source.width, source.height));
    }
    composeFrame(compositor, project, assets, t, { source: (c) => sources.get(c.id), mask: (c) => masks.get(c.id) }, visible);
    ctx.drawImage(glCanvas, 0, 0);
    drawTexts(ctx, project.clips, t, width, height);
    await videoSource.add(t, 1 / fps);

    // Bitmiş kliplerin okuyucularını kapatıp belleği boşalt.
    for (const [id, reader] of readers) {
      const clip = project.clips.find((c) => c.id === id);
      if (!clip || clipEnd(clip) + 1 < t) {
        await reader.close();
        readers.delete(id);
      }
    }
    options.onProgress((i / totalFrames) * 0.95);
  }

  if (audioSource) {
    const mix = await mixTimelineAudio(project.clips, assets, 48000, 2, [0, duration]);
    await audioSource.add(mix);
  }
  await output.finalize();
  remover?.dispose();
  options.onProgress(1);
  return new Blob([target.buffer!], { type: 'video/mp4' });
}
