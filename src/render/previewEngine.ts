import { BackgroundRemover } from '../ai/vision';
import { fadeGain, valueAt } from '../core/animation';
import { speedAt } from '../core/speed';
import { isActiveAt } from '../core/timeline';
import { envelopeAt, previewDuckEnvelope } from '../media/ducking';
import type { Asset, MediaClip, Project } from '../core/types';
import { Compositor, type Mask } from './compositor';
import { clipSourceTime, clipsToDraw, composeFrame, drawTexts, visibleClips, type VisualSource } from './composeFrame';

const DRIFT_PLAYING = 0.25;
const DRIFT_PAUSED = 0.02;

// Önizleme: her klip için bir <video> öğesi atar, zamanı senkronlar ve kareyi WebGL ile çizer.
export class PreviewEngine {
  private compositor: Compositor;
  private pools = new Map<string, HTMLVideoElement[]>(); // varlık başına öğe havuzu
  private images = new Map<string, HTMLImageElement>();
  private assigned = new Map<string, HTMLVideoElement>(); // klip → öğe
  private remover: BackgroundRemover | null = null;
  private masks = new Map<string, { time: number; mask: Mask }>();

  constructor(glCanvas: HTMLCanvasElement, private textCanvas: HTMLCanvasElement) {
    this.compositor = new Compositor(glCanvas, 2, 2);
  }

  setSize(width: number, height: number) {
    this.compositor.resize(width, height);
    this.textCanvas.width = width;
    this.textCanvas.height = height;
  }

  tick(project: Project, assets: Record<string, Asset>, t: number, playing: boolean) {
    const visible = visibleClips(project.clips, assets, t);
    const drawn = clipsToDraw(visible);
    this.syncMedia(project, assets, t, playing, drawn);

    const sources = new Map<string, VisualSource>();
    let ready = true;
    for (const clip of drawn) {
      const source = this.sourceFor(clip, assets);
      if (!source) ready = false;
      else sources.set(clip.id, source);
    }
    // Kare hazır değilse önceki kareyi ekranda bırak (titremeyi önler).
    if (ready) {
      composeFrame(
        this.compositor,
        project,
        assets,
        t,
        { source: (c) => sources.get(c.id), mask: (c) => this.maskFor(c, sources.get(c.id), assets, t, playing) },
        visible,
      );
    }
    const ctx = this.textCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    drawTexts(ctx, project.clips, t, this.textCanvas.width, this.textCanvas.height);
  }

  // Görüntüsü veya sesi o an gereken klipler.
  private mediaClipsAt(project: Project, assets: Record<string, Asset>, t: number, drawn: MediaClip[]) {
    const clips = new Set(drawn);
    for (const clip of project.clips) {
      if (clip.type === 'media' && isActiveAt(clip, t)) clips.add(clip);
    }
    return [...clips].filter((c) => assets[c.assetId] && assets[c.assetId].kind !== 'image');
  }

  private syncMedia(project: Project, assets: Record<string, Asset>, t: number, playing: boolean, drawn: MediaClip[]) {
    const active = this.mediaClipsAt(project, assets, t, drawn).sort((a, b) => a.start - b.start);
    const duck = previewDuckEnvelope(project.clips, assets);
    const used = new Set<HTMLVideoElement>();
    this.assigned.clear();

    const byAsset = new Map<string, MediaClip[]>();
    for (const clip of active) byAsset.set(clip.assetId, [...(byAsset.get(clip.assetId) ?? []), clip]);

    for (const [assetId, clips] of byAsset) {
      const pool = this.pools.get(assetId) ?? [];
      while (pool.length < clips.length) pool.push(createVideo(assets[assetId].url));
      this.pools.set(assetId, pool);
      clips.forEach((clip, i) => {
        const element = pool[i];
        this.assigned.set(clip.id, element);
        used.add(element);
        const volume = valueAt(clip, 'volume', t) * fadeGain(clip, t) * (clip.duck ? envelopeAt(duck, t) : 1);
        syncElement(element, clip, t, clipSourceTime(clip, t, assets), playing, volume);
      });
    }

    for (const pool of this.pools.values()) {
      for (const element of pool) if (!used.has(element) && !element.paused) element.pause();
    }
  }

  private sourceFor(clip: MediaClip, assets: Record<string, Asset>): VisualSource | undefined {
    const asset = assets[clip.assetId];
    if (asset.kind === 'image') {
      let image = this.images.get(asset.id);
      if (!image) {
        image = new Image();
        image.src = asset.url;
        this.images.set(asset.id, image);
      }
      return image.complete && image.naturalWidth ? { source: image, width: image.naturalWidth, height: image.naturalHeight } : undefined;
    }
    const element = this.assigned.get(clip.id);
    if (!element || element.readyState < 2 || (element.paused && element.seeking)) return undefined;
    return { source: element, width: element.videoWidth, height: element.videoHeight };
  }

  private maskFor(clip: MediaClip, source: VisualSource | undefined, assets: Record<string, Asset>, t: number, playing: boolean) {
    if (!source) return null;
    this.remover ??= new BackgroundRemover();
    const time = clipSourceTime(clip, t, assets);
    const cached = this.masks.get(clip.id);
    if (cached && !playing && Math.abs(cached.time - time) < 0.01) return cached.mask;
    const mask = this.remover.segmentIfReady(source.source, source.width, source.height);
    if (mask) this.masks.set(clip.id, { time, mask });
    return mask ?? cached?.mask ?? null;
  }

  // Bir varlığın klipleri silinmişse havuzu boşalt.
  prune(project: Project) {
    const assetIds = new Set(project.clips.flatMap((c) => (c.type === 'media' ? [c.assetId] : [])));
    for (const [assetId, pool] of this.pools) {
      if (assetIds.has(assetId)) continue;
      pool.forEach(disposeVideo);
      this.pools.delete(assetId);
    }
  }

  dispose() {
    for (const pool of this.pools.values()) pool.forEach(disposeVideo);
    this.pools.clear();
  }
}

function createVideo(url: string) {
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'auto';
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  return video;
}

function disposeVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function syncElement(element: HTMLVideoElement, clip: MediaClip, t: number, expected: number, playing: boolean, volume: number) {
  element.muted = clip.muted;
  element.volume = Math.min(Math.max(volume, 0), 1);
  element.preservesPitch = true;
  const rate = Math.min(Math.max(speedAt(clip, t - clip.start), 0.0625), 16);
  if (Math.abs(element.playbackRate - rate) > 0.01) element.playbackRate = rate;
  const drift = Math.abs(element.currentTime - expected);
  if (playing) {
    if (element.paused) {
      element.currentTime = expected;
      void element.play().catch(() => {});
    } else if (drift > DRIFT_PLAYING * clip.speed) {
      element.currentTime = expected;
    }
    return;
  }
  if (!element.paused) element.pause();
  if (drift > DRIFT_PAUSED && !element.seeking) element.currentTime = expected;
}

