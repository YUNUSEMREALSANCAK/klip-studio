import { isActiveAt, sortedTrack, sourceTime, transitionAt, type TransitionState } from '../core/timeline';
import { animatedState } from '../core/animation';
import { DEFAULT_TRANSFORM, type Asset, type Clip, type MediaClip, type Project, type ReframeTrack, type TextClip } from '../core/types';
import type { Compositor, LutData, Mask } from './compositor';
import { drawText } from './text';

export interface VisualSource {
  source: TexImageSource;
  width: number;
  height: number;
}

export interface FrameInputs {
  source: (clip: MediaClip) => VisualSource | undefined;
  mask: (clip: MediaClip) => Mask | null | undefined;
}

export interface VisibleClips {
  transition: TransitionState | null;
  main: MediaClip | null;
  overlays: MediaClip[];
}

const isVisual = (clip: Clip, assets: Record<string, Asset>): clip is MediaClip =>
  clip.type === 'media' && assets[clip.assetId]?.kind !== 'audio';

export function visibleClips(clips: Clip[], assets: Record<string, Asset>, t: number): VisibleClips {
  const transition = transitionAt(clips, t);
  const main = sortedTrack<MediaClip>(clips, 'main').find((c) => isActiveAt(c, t) && isVisual(c, assets)) ?? null;
  const overlays = sortedTrack<MediaClip>(clips, 'overlay').filter((c) => isActiveAt(c, t) && isVisual(c, assets));
  return { transition, main, overlays };
}

// O anda çizilmesi gereken tüm klipler (geçişte iki ana klip birden).
export function clipsToDraw(visible: VisibleClips): MediaClip[] {
  const main = visible.transition ? [visible.transition.from, visible.transition.to] : visible.main ? [visible.main] : [];
  return [...main, ...visible.overlays];
}

export function clipSourceTime(clip: MediaClip, t: number, assets: Record<string, Asset>) {
  const asset = assets[clip.assetId];
  return asset.kind === 'image' ? 0 : sourceTime(clip, t, asset.duration);
}

export function focusAt(reframe: ReframeTrack | undefined, time: number) {
  if (!reframe || !reframe.times.length) return undefined;
  const { times, centers } = reframe;
  if (time <= times[0]) return centers[0];
  for (let i = 1; i < times.length; i++) {
    if (time <= times[i]) {
      const k = (time - times[i - 1]) / (times[i] - times[i - 1]);
      return centers[i - 1] + (centers[i] - centers[i - 1]) * k;
    }
  }
  return centers[centers.length - 1];
}

const lutCache = new Map<string, LutData>();

function lutFor(project: Project, id: string | undefined): LutData | null {
  const lut = id ? project.luts[id] : undefined;
  if (!lut) return null;
  if (!lutCache.has(lut.id)) {
    const bytes = Uint8Array.from(atob(lut.data), (c) => c.charCodeAt(0));
    lutCache.set(lut.id, { id: lut.id, size: lut.size, data: bytes });
  }
  return lutCache.get(lut.id)!;
}

function drawMedia(
  compositor: Compositor,
  project: Project,
  clip: MediaClip,
  t: number,
  assets: Record<string, Asset>,
  inputs: FrameInputs,
  target: 'screen' | 'from' | 'to',
) {
  const visual = inputs.source(clip);
  if (!visual) return;
  const isOverlay = clip.track === 'overlay';
  const focusX = focusAt(clip.reframe, clipSourceTime(clip, t, assets));
  const mode = isOverlay ? 'overlay' : focusX !== undefined ? 'cover' : 'contain';
  const state = animatedState(clip, t);

  // Bulanık tuval: ana videonun dolduran, bulanık ve hafif karartılmış kopyası arkaya çizilir.
  if (!isOverlay && project.backgroundBlur && mode === 'contain') {
    compositor.drawLayer(
      {
        ...visual,
        filter: { ...clip.filter, brightness: clip.filter.brightness - 0.15, vignette: 0, sharpen: 0 },
        transform: DEFAULT_TRANSFORM,
        mode: 'cover',
        blur: Math.max(visual.width, visual.height) / 120,
      },
      target,
    );
  }

  compositor.drawLayer(
    {
      ...visual,
      filter: clip.filter,
      transform: state.transform,
      opacity: state.opacity,
      mode,
      focusX,
      matte: clip.removeBackground ? inputs.mask(clip) : null,
      shape: clip.mask,
      chroma: clip.chroma,
      lut: lutFor(project, clip.filter.lutId),
    },
    target,
  );
}

export function composeFrame(
  compositor: Compositor,
  project: Project,
  assets: Record<string, Asset>,
  t: number,
  inputs: FrameInputs,
  visible = visibleClips(project.clips, assets, t),
) {
  compositor.begin(project.background);
  if (visible.transition) {
    const { from, to, progress } = visible.transition;
    drawMedia(compositor, project, from, t, assets, inputs, 'from');
    drawMedia(compositor, project, to, t, assets, inputs, 'to');
    compositor.drawTransition(to.transition!.type, progress);
  } else if (visible.main) {
    drawMedia(compositor, project, visible.main, t, assets, inputs, 'screen');
  }
  for (const overlay of visible.overlays) drawMedia(compositor, project, overlay, t, assets, inputs, 'screen');
}

export function drawTexts(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  clips: Clip[],
  t: number,
  width: number,
  height: number,
) {
  for (const clip of sortedTrack<TextClip>(clips, 'text')) {
    if (isActiveAt(clip, t)) drawText(ctx, clip, t, width, height);
  }
}
