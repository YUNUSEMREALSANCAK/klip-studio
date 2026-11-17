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
import { FrameInterpolator } from '../ai/rife';
import { clipEnd, projectDuration } from '../core/timeline';
import type { Asset, MediaClip, Project, TextClip } from '../core/types';
import { ensureFonts, registerProjectFonts } from '../render/fonts';
import { mixTimelineAudio } from '../media/audio';
import { normalizeLoudness, SOCIAL_LOUDNESS } from '../media/loudness';
import { Compositor, type Mask } from '../render/compositor';
import { clipSourceTime, clipsToDraw, composeFrame, drawTexts, visibleClips, type VisualSource } from '../render/composeFrame';

// Reads a clip's frames in order, seeking forward when needed.
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

  // The pending (next) frame and the position between frames, for frame blending.
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
  loudness?: number | null; // target LUFS for the final mix (default -14, like Instagram/TikTok); null leaves it as mixed
}

// Draws project frames at export quality; shared by the video export and still frames.
class FrameRenderer {
  readonly canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private glCanvas: OffscreenCanvas;
  private compositor: Compositor;
  private tracks = new Map<string, Promise<InputVideoTrack | null>>();
  private readers = new Map<string, FrameReader>();
  private images = new Map<string, Promise<ImageBitmap>>();
  private interpolator?: FrameInterpolator; // created on the first RIFE frame
  private remover: WorkerBackgroundRemover | null;

  constructor(
    private project: Project,
    private assets: Record<string, Asset>,
    private width: number,
    private height: number,
  ) {
    this.glCanvas = new OffscreenCanvas(width, height);
    this.compositor = new Compositor(this.glCanvas, width, height);
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d')!;
    this.remover = project.clips.some((c) => c.type === 'media' && c.removeBackground) ? new WorkerBackgroundRemover() : null;
  }

  async loadFonts() {
    await registerProjectFonts(this.project.fonts);
    await ensureFonts(this.project.clips.filter((c): c is TextClip => c.type === 'text'));
  }

  private videoTrack(asset: Asset) {
    if (!this.tracks.has(asset.id)) {
      const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
      this.tracks.set(asset.id, input.getPrimaryVideoTrack());
    }
    return this.tracks.get(asset.id)!;
  }

  private async loadSource(clip: MediaClip, t: number): Promise<VisualSource | undefined> {
    const asset = this.assets[clip.assetId];
    if (asset.kind === 'image') {
      if (!this.images.has(asset.id)) this.images.set(asset.id, createImageBitmap(asset.file));
      const bitmap = await this.images.get(asset.id)!;
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
    if (!this.readers.has(clip.id)) {
      const track = await this.videoTrack(asset);
      if (!track) return undefined;
      // Transparent videos (VP9/AV1 with alpha, e.g. rendered titles) keep their alpha.
      this.readers.set(clip.id, new FrameReader(new CanvasSink(track, { alpha: await track.canBeTransparent() })));
    }
    const reader = this.readers.get(clip.id)!;
    const time = clipSourceTime(clip, t, this.assets);
    const frame = await reader.frameAt(time);
    if (!frame) return undefined;
    const { width, height } = frame.canvas;
    const next = clip.slowMotion && clip.speed < 1 ? reader.blendAt(time) : null;
    if (next && clip.slowMotion === 'ai' && next.weight > 0.01) {
      // A real in-between frame from RIFE, scaled back to the original size.
      this.interpolator ??= new FrameInterpolator();
      const middle = await this.interpolator.interpolate(frame.canvas, next.source, width, height, next.weight);
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext('2d')!.drawImage(middle, 0, 0, width, height);
      return { source: canvas, width, height };
    }
    return { source: frame.canvas, width, height, blend: next ?? undefined };
  }

  // Draws the frame at time t into `canvas`.
  async render(t: number) {
    const { project, assets } = this;
    const visible = visibleClips(project.clips, assets, t);
    const sources = new Map<string, VisualSource>();
    const masks = new Map<string, Mask>();
    for (const clip of clipsToDraw(visible)) {
      const source = await this.loadSource(clip, t);
      if (!source) continue;
      sources.set(clip.id, source);
      if (clip.removeBackground && this.remover) masks.set(clip.id, await this.remover.segment(source.source, source.width, source.height));
    }
    composeFrame(this.compositor, project, assets, t, { source: (c) => sources.get(c.id), mask: (c) => masks.get(c.id) }, visible);
    this.ctx.drawImage(this.glCanvas, 0, 0);
    drawTexts(this.ctx, project.clips, t, this.width, this.height);
  }

  // Closes readers of clips that ended before t, to free memory.
  async release(t: number) {
    for (const [id, reader] of this.readers) {
      const clip = this.project.clips.find((c) => c.id === id);
      if (!clip || clipEnd(clip) + 1 < t) {
        await reader.close();
        this.readers.delete(id);
      }
    }
  }

  async dispose() {
    await this.release(Infinity);
    this.remover?.dispose();
    this.interpolator?.dispose();
  }
}

// The frame at time t as a PNG at full export size (e.g. a cover image).
export async function exportFrame(project: Project, assets: Record<string, Asset>, t: number, width: number, height: number): Promise<Blob> {
  const renderer = new FrameRenderer(project, assets, width, height);
  try {
    await renderer.loadFonts();
    await renderer.render(t);
    return await renderer.canvas.convertToBlob({ type: 'image/png' });
  } finally {
    await renderer.dispose();
  }
}

export async function exportVideo(project: Project, assets: Record<string, Asset>, options: ExportOptions): Promise<Blob> {
  const { width, height, fps } = options;
  const duration = projectDuration(project.clips);
  if (duration <= 0) throw new Error('The timeline is empty');

  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
  if (!videoCodec) throw new Error('Your browser does not support video encoding (WebCodecs)');
  const audioCodec = await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: 48000 });

  const renderer = new FrameRenderer(project, assets, width, height);
  await renderer.loadFonts();

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const videoSource = new CanvasSource(renderer.canvas, { codec: videoCodec, quality: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: fps });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  try {
    const totalFrames = Math.ceil(duration * fps);
    for (let i = 0; i < totalFrames; i++) {
      if (options.signal?.aborted) {
        await output.cancel();
        throw new DOMException('Cancelled', 'AbortError');
      }
      const t = i / fps;
      await renderer.render(t);
      await videoSource.add(t, 1 / fps);
      await renderer.release(t);
      options.onProgress((i / totalFrames) * 0.95);
    }

    if (audioSource) {
      const mix = await mixTimelineAudio(project.clips, assets, 48000, 2, [0, duration]);
      const loudness = options.loudness === undefined ? SOCIAL_LOUDNESS : options.loudness;
      if (loudness !== null) {
        const channels = Array.from({ length: mix.numberOfChannels }, (_, ch) => mix.getChannelData(ch));
        normalizeLoudness(channels, mix.sampleRate, loudness);
      }
      await audioSource.add(mix);
    }
    await output.finalize();
  } finally {
    await renderer.dispose();
  }
  options.onProgress(1);
  return new Blob([target.buffer!], { type: 'video/mp4' });
}
