import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { useEditor } from '../core/store';
import { assignLanes, clipEnd, createMediaClip, formatTime, projectDuration, sortedTrack } from '../core/timeline';
import type { Clip, MediaClip, TrackId } from '../core/types';
import { decodeAssetAudio } from '../media/audio';
import { thumbnailOf } from '../media/importMedia';
import { Icon } from './icons';
import { applyTransition } from './transitions';

const TRACKS: { id: TrackId; label: string }[] = [
  { id: 'text', label: 'Metin' },
  { id: 'overlay', label: 'Üst katman' },
  { id: 'main', label: 'Ana video' },
  { id: 'audio', label: 'Ses' },
];

const SNAP_PX = 8;
const LANE_HEIGHT = 44;
const MAIN_HEIGHT = 64;
const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120];

type DragMode = 'move' | 'trim-start' | 'trim-end';

interface DragState {
  mode: DragMode;
  clipId: string;
  originX: number;
  original: Clip;
}

export function Timeline() {
  const clips = useEditor((s) => s.project.clips);
  const assets = useEditor((s) => s.assets);
  const zoom = useEditor((s) => s.zoom);
  const selectedId = useEditor((s) => s.selectedId);
  const markers = useEditor((s) => s.project.markers);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const duration = projectDuration(clips);
  const contentWidth = Math.max((duration + 20) * zoom, (scrollRef.current?.clientWidth ?? 800) + 200);
  const tickStep = TICK_STEPS.find((s) => s * zoom >= 70) ?? 300;

  const timeFromEvent = (clientX: number) => {
    const rect = scrollRef.current!.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + scrollRef.current!.scrollLeft) / zoom);
  };

  const snap = (time: number, ignoreId: string) => {
    const s = useEditor.getState();
    const candidates = [0, s.time, ...s.project.markers, ...s.project.clips.filter((c) => c.id !== ignoreId).flatMap((c) => [c.start, clipEnd(c)])];
    const threshold = SNAP_PX / zoom;
    let best = time;
    let distance = threshold;
    for (const c of candidates) {
      if (Math.abs(c - time) < distance) {
        best = c;
        distance = Math.abs(c - time);
      }
    }
    return best;
  };

  const startDrag = (event: PointerEvent, clip: Clip, mode: DragMode) => {
    event.stopPropagation();
    const s = useEditor.getState();
    s.select(clip.id);
    s.setPlaying(false);
    s.checkpoint();
    drag.current = { mode, clipId: clip.id, originX: event.clientX, original: clip };
    if (event.isPrimary) (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    // Tuş bırakılmışsa (ör. imleç çizelge dışında bırakıldıysa) sürükleme biter; klipler kendiliğinden kaymaz.
    if (!(event.buttons & 1)) {
      drag.current = null;
      return;
    }
    const { original, mode } = state;
    const delta = (event.clientX - state.originX) / zoom;
    const s = useEditor.getState();
    const asset = original.type === 'media' ? s.assets[original.assetId] : null;
    const maxSource = asset && asset.kind !== 'image' ? asset.duration : Infinity;

    let patch: Partial<Clip> = {};
    if (mode === 'move') {
      const start = Math.max(0, original.start + delta);
      const snappedStart = snap(start, original.id);
      const snappedEnd = snap(start + original.duration, original.id);
      patch.start = snappedStart !== start ? snappedStart : snappedEnd - original.duration;
    } else if (mode === 'trim-start') {
      const sourceIn = original.type === 'media' ? original.in : 0;
      const minDelta = asset && asset.kind !== 'image' ? -sourceIn : -original.start;
      const d = Math.min(Math.max(snap(original.start + delta, original.id) - original.start, minDelta, -original.start), original.duration - 0.1);
      patch = { start: original.start + d, duration: original.duration - d };
      if (original.type === 'media') (patch as Partial<MediaClip>).in = original.in + d;
    } else {
      const sourceIn = original.type === 'media' ? original.in : 0;
      const end = snap(clipEnd(original) + delta, original.id);
      patch.duration = Math.min(Math.max(end - original.start, 0.1), maxSource - sourceIn);
    }
    s.updateClip(original.id, patch, false);
  };

  const endDrag = () => (drag.current = null);

  const scrub = (event: PointerEvent) => {
    const s = useEditor.getState();
    s.setPlaying(false);
    s.setTime(timeFromEvent(event.clientX));
  };

  const onDrop = (event: DragEvent, track: TrackId) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData('text/asset-id');
    const s = useEditor.getState();
    const asset = s.assets[assetId];
    if (!asset || track === 'text') return;
    const target = asset.kind === 'audio' ? 'audio' : track === 'audio' ? 'main' : track;
    const clip = createMediaClip(asset, target, timeFromEvent(event.clientX));
    s.mutate((all) => [...all, clip]);
    s.select(clip.id);
  };

  const mainClips = sortedTrack<MediaClip>(clips, 'main');

  // Üst üste binen metin/üst katman/ses klipleri ayrı şeritlere dizilir; iz yüksekliği şerit sayısıyla büyür.
  const layout = useMemo(() => {
    const result = {} as Record<TrackId, { lanes: Map<string, number>; height: number }>;
    for (const { id } of TRACKS) {
      const onTrack = clips.filter((c) => c.track === id);
      if (id === 'main') result[id] = { lanes: new Map(), height: MAIN_HEIGHT };
      else {
        const { lanes, count } = assignLanes(onTrack);
        result[id] = { lanes, height: count * LANE_HEIGHT + 8 };
      }
    }
    return result;
  }, [clips]);

  return (
    <section className="timeline">
      <div className="tl-toolbar">
        <button className="btn ghost small" title="Böl (S)" onClick={() => useEditor.getState().splitAtPlayhead()}>
          <Icon name="split" size={16} /> Böl
        </button>
        <button className="btn ghost small" title="Sil" disabled={!selectedId} onClick={() => selectedId && useEditor.getState().removeClip(selectedId)}>
          <Icon name="trash" size={16} /> Sil
        </button>
        {markers.length > 0 && (
          <button className="btn ghost small" onClick={() => useEditor.getState().setMarkers([])}>
            Ritim işaretlerini temizle
          </button>
        )}
        <div className="spacer" />
        <button className="btn ghost icon" onClick={() => useEditor.getState().setZoom(zoom / 1.4)}>
          <Icon name="zoomOut" size={16} />
        </button>
        <input type="range" min={8} max={400} value={zoom} onChange={(e) => useEditor.getState().setZoom(+e.target.value)} />
        <button className="btn ghost icon" onClick={() => useEditor.getState().setZoom(zoom * 1.4)}>
          <Icon name="zoomIn" size={16} />
        </button>
      </div>
      <div className="tl-body">
        <div className="tl-labels" ref={labelsRef}>
          {TRACKS.map((t) => (
            <div key={t.id} className="tl-label" style={{ height: layout[t.id].height }}>
              {t.label}
            </div>
          ))}
        </div>
        <div className="tl-scroll" ref={scrollRef} onScroll={(e) => labelsRef.current && (labelsRef.current.scrollTop = e.currentTarget.scrollTop)}>
          <div className="tl-content" style={{ width: contentWidth }} onPointerMove={onDragMove} onPointerUp={endDrag}>
            <div
              className="ruler"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scrub(e);
              }}
              onPointerMove={(e) => e.buttons === 1 && scrub(e)}
            >
              {Array.from({ length: Math.ceil(contentWidth / zoom / tickStep) }, (_, i) => (
                <div key={i} className="tick" style={{ left: i * tickStep * zoom }}>
                  {formatTime(i * tickStep).slice(0, 5)}
                </div>
              ))}
            </div>
            {TRACKS.map((track) => (
              <div
                key={track.id}
                className={`track ${track.id === 'main' ? 'main' : ''}`}
                style={{ height: layout[track.id].height }}
                onPointerDown={(e) => {
                  useEditor.getState().select(null);
                  scrub(e);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, track.id)}
              >
                {clips
                  .filter((c) => c.track === track.id)
                  .map((clip) => (
                    <TimelineClip
                      key={clip.id}
                      clip={clip}
                      zoom={zoom}
                      top={track.id === 'main' ? 6 : (layout[track.id].lanes.get(clip.id) ?? 0) * LANE_HEIGHT + 6}
                      height={track.id === 'main' ? MAIN_HEIGHT - 12 : LANE_HEIGHT - 8}
                      selected={clip.id === selectedId}
                      assets={assets}
                      onDragStart={startDrag}
                    />
                  ))}
                {track.id === 'main' &&
                  mainClips.slice(1).map((clip, i) => (
                    <div
                      key={`t-${clip.id}`}
                      className={`transition-badge ${clip.transition ? '' : 'empty'}`}
                      style={{ left: clip.start * zoom }}
                      title={clip.transition ? 'Geçişi düzenle' : 'Geçiş ekle (çapraz geçiş)'}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        // Kesimi hedeflemek için önceki klibi seç; geçiş yoksa çapraz geçiş ekle.
                        useEditor.getState().select(mainClips[i].id);
                        const cut = { from: mainClips[i], to: clip, index: i + 1 };
                        applyTransition(cut, clip.transition?.type ?? 'fade');
                      }}
                    />
                  ))}
              </div>
            ))}
            {markers.map((m, i) => (
              <div key={i} className="marker" style={{ left: m * zoom }} />
            ))}
            <Playhead zoom={zoom} scrollRef={scrollRef} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Playhead({ zoom, scrollRef }: { zoom: number; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const time = useEditor((s) => s.time);
  const playing = useEditor((s) => s.playing);
  const x = time * zoom;
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !playing) return;
    if (x > scroller.scrollLeft + scroller.clientWidth - 60) scroller.scrollLeft = x - 120;
  }, [x, playing, scrollRef]);
  return <div className="playhead" style={{ left: x }} />;
}

function TimelineClip({ clip, zoom, top, height, selected, assets, onDragStart }: {
  clip: Clip;
  zoom: number;
  top: number;
  height: number;
  selected: boolean;
  assets: ReturnType<typeof useEditor.getState>['assets'];
  onDragStart: (event: PointerEvent, clip: Clip, mode: DragMode) => void;
}) {
  const asset = clip.type === 'media' ? assets[clip.assetId] : null;
  const width = Math.max(clip.duration * zoom, 4);
  const label = clip.type === 'text' ? clip.text : asset?.name;
  const muted = clip.type === 'media' && clip.muted;
  return (
    <div
      className={`clip ${clip.track} ${selected ? 'selected' : ''} ${muted ? 'muted' : ''}`}
      style={{
        left: clip.start * zoom,
        width,
        top,
        height,
        backgroundImage: asset && asset.kind !== 'audio' && thumbnailOf(asset) ? `url(${thumbnailOf(asset)})` : undefined,
      }}
      onPointerDown={(e) => onDragStart(e, clip, 'move')}
      title={label}
    >
      {asset && asset.hasAudio && clip.type === 'media' && <Waveform clip={clip} width={width} compact={asset.kind !== 'audio'} />}
      <div className="handle left" onPointerDown={(e) => onDragStart(e, clip, 'trim-start')} />
      <span className="clip-label">
        {clip.type === 'media' && clip.removeBackground ? '✂ ' : ''}
        {label}
      </span>
      <div className="handle right" onPointerDown={(e) => onDragStart(e, clip, 'trim-end')} />
    </div>
  );
}

const peaksCache = new Map<string, Promise<Float32Array>>();
const PEAKS_PER_SECOND = 50;

function peaksFor(assetId: string) {
  if (!peaksCache.has(assetId)) {
    const asset = useEditor.getState().assets[assetId];
    peaksCache.set(
      assetId,
      decodeAssetAudio(asset).then((buffer) => {
        const data = buffer.getChannelData(0);
        const block = Math.floor(buffer.sampleRate / PEAKS_PER_SECOND);
        const peaks = new Float32Array(Math.ceil(data.length / block));
        for (let i = 0; i < peaks.length; i++) {
          let max = 0;
          for (let j = i * block; j < Math.min((i + 1) * block, data.length); j++) max = Math.max(max, Math.abs(data[j]));
          peaks[i] = max;
        }
        return peaks;
      }),
    );
  }
  return peaksCache.get(assetId)!;
}

function Waveform({ clip, width, compact }: { clip: MediaClip; width: number; compact: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);

  useEffect(() => {
    let alive = true;
    peaksFor(clip.assetId).then((p) => alive && setPeaks(p)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [clip.assetId]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !peaks) return;
    const w = Math.min(Math.round(width), 8000);
    const h = 40;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    const from = clip.in * PEAKS_PER_SECOND;
    const span = clip.duration * PEAKS_PER_SECOND;
    for (let x = 0; x < w; x++) {
      const value = peaks[Math.floor(from + (x / w) * span)] ?? 0;
      const bar = Math.max(1, value * h);
      ctx.fillRect(x, (h - bar) / 2, 1, bar);
    }
  }, [peaks, width, clip.in, clip.duration]);

  return <canvas ref={ref} className={`wave ${compact ? 'compact' : ''}`} />;
}
