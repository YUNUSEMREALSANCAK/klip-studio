import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from '../core/store';
import { isActiveAt } from '../core/timeline';
import { ASPECT_SIZES, type Asset, type Clip, type MediaClip, type TextClip } from '../core/types';
import { animatedState, setValue, valueAt } from '../core/animation';
import { clipSourceTime, focusAt } from '../render/composeFrame';
import { fitRect, overlayRect, textRect, type Rect } from '../render/layout';

const SNAP = 0.015; // merkeze yapışma eşiği (tuval oranı)
const HANDLES = ['nw', 'ne', 'sw', 'se'] as const;

type Editable = MediaClip | TextClip;

interface Drag {
  mode: 'move' | 'resize';
  clip: Editable;
  startX: number; // tuval pikseli
  startY: number;
  startDistance: number;
  center: { x: number; y: number };
}

const isEditable = (clip: Clip, assets: Record<string, Asset>): clip is Editable =>
  clip.type === 'text' || (clip.track !== 'audio' && assets[clip.assetId]?.kind !== 'audio');

// Seçimde öncelik: metin, üst katman, ana video.
const LAYER_ORDER = { text: 0, overlay: 1, main: 2 } as const;

function rectFor(clip: Editable, assets: Record<string, Asset>, W: number, H: number, time: number): Rect | null {
  if (clip.type === 'text') return textRect(clip, W, H);
  const asset = assets[clip.assetId];
  if (!asset?.width || !asset.height) return null;
  const { transform } = animatedState(clip, time);
  if (clip.track === 'overlay') return overlayRect(transform, asset.width, asset.height, W, H);
  const focusX = focusAt(clip.reframe, clipSourceTime(clip, time, assets));
  return fitRect(transform, asset.width, asset.height, W, H, focusX !== undefined ? 'cover' : 'contain', focusX);
}

const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const snap = (v: number, active: (on: boolean) => void) => {
  const on = Math.abs(v - 0.5) < SNAP;
  active(on);
  return on ? 0.5 : v;
};

// Önizleme üstündeki seçim kutusu: üst katman ve metinleri sürükleme ve köşelerden boyutlandırma.
export function StageEditor({ width, height }: { width: number; height: number }) {
  const clips = useEditor((s) => s.project.clips);
  const assets = useEditor((s) => s.assets);
  const aspect = useEditor((s) => s.project.aspect);
  const selectedId = useEditor((s) => s.selectedId);
  const time = useEditor((s) => s.time);
  const [guides, setGuides] = useState({ vertical: false, horizontal: false });
  const drag = useRef<Drag | null>(null);
  const layer = useRef<HTMLDivElement>(null);

  const { width: W, height: H } = ASPECT_SIZES[aspect];
  const scale = width / W; // CSS pikseli / tuval pikseli

  // Üstte çizilen önce gelir: metinler, üst katmanlar (sondan başa), en son ana video.
  const targets = clips.filter((c): c is Editable => isEditable(c, assets) && isActiveAt(c, time));
  targets.sort((a, b) => LAYER_ORDER[a.track as keyof typeof LAYER_ORDER] - LAYER_ORDER[b.track as keyof typeof LAYER_ORDER] || clips.indexOf(b) - clips.indexOf(a));
  const selected = targets.find((c) => c.id === selectedId) ?? null;
  const selectedRect = selected ? rectFor(selected, assets, W, H, time) : null;

  const toCanvas = (event: PointerEvent | ReactPointerEvent) => {
    const r = layer.current!.getBoundingClientRect();
    return { x: ((event.clientX - r.left) / r.width) * W, y: ((event.clientY - r.top) / r.height) * H };
  };

  const onMove = (event: PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const p = toCanvas(event);
    const { clip } = state;
    const s = useEditor.getState();

    if (state.mode === 'resize') {
      const distance = Math.hypot(p.x - state.center.x, p.y - state.center.y);
      const ratio = distance / Math.max(state.startDistance, 1);
      if (clip.type === 'text') s.updateClip(clip.id, { fontSize: clamp(clip.fontSize * ratio, 0.02, 0.25) }, false);
      else {
        const scale = clamp(valueAt(clip, 'scale', s.time) * ratio, 0.05, 2);
        s.updateClip(clip.id, setValue(clip, 'scale', scale, s.time) as Partial<MediaClip>, false);
      }
      return;
    }

    // Tutulan nokta ile merkez arasındaki fark korunur; öğe imlece zıplamaz.
    const dx = (p.x - state.startX) / W;
    const dy = (p.y - state.startY) / H;
    let vertical = false;
    let horizontal = false;
    if (clip.type === 'text') {
      const y = snap(clamp(clip.y + dy, 0.05, 0.95), (on) => (horizontal = on));
      s.updateClip(clip.id, { y }, false);
    } else {
      // Anahtar kare varsa oynatma çizgisindeki kare güncellenir, yoksa temel konum.
      const x = snap(clamp(valueAt(clip, 'x', s.time) + dx, 0, 1), (on) => (vertical = on));
      const y = snap(clamp(valueAt(clip, 'y', s.time) + dy, 0, 1), (on) => (horizontal = on));
      const withX = { ...clip, ...setValue(clip, 'x', x, s.time) } as MediaClip;
      s.updateClip(clip.id, { ...setValue(clip, 'x', x, s.time), ...setValue(withX, 'y', y, s.time) } as Partial<MediaClip>, false);
    }
    setGuides({ vertical, horizontal });
  };

  const onUp = () => {
    drag.current = null;
    setGuides({ vertical: false, horizontal: false });
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  const startDrag = (event: ReactPointerEvent, clip: Editable, mode: Drag['mode']) => {
    event.stopPropagation();
    event.preventDefault();
    const rect = rectFor(clip, assets, W, H, useEditor.getState().time);
    if (!rect) return;
    const p = toCanvas(event);
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    const s = useEditor.getState();
    s.select(clip.id);
    s.setPlaying(false);
    s.checkpoint();
    drag.current = { mode, clip, startX: p.x, startY: p.y, center, startDistance: Math.hypot(p.x - center.x, p.y - center.y) };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Boş alana tıklama hiçbir şeyi taşımaz; yalnızca altında öğe varsa onu seçip sürükler.
  const onStagePointerDown = (event: ReactPointerEvent) => {
    const p = toCanvas(event);
    const hit = targets.find((c) => {
      const r = rectFor(c, assets, W, H, time);
      return r && contains(r, p.x, p.y);
    });
    if (hit) startDrag(event, hit, 'move');
  };

  const rotation = selected?.type === 'media' ? animatedState(selected, time).transform.rotation : 0;
  const box = selectedRect && {
    left: selectedRect.x * scale,
    top: selectedRect.y * scale,
    width: selectedRect.w * scale,
    height: selectedRect.h * scale,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  };

  return (
    <div ref={layer} className="stage-editor" style={{ width, height }} onPointerDown={onStagePointerDown}>
      {guides.vertical && <div className="guide vertical" />}
      {guides.horizontal && <div className="guide horizontal" />}
      {selected && box && (
        <div className={`sel-box ${selected.type === 'media' ? selected.track : 'text'}`} style={box} onPointerDown={(e) => startDrag(e, selected, 'move')}>
          {HANDLES.map((h) => (
            <span key={h} className={`sel-handle ${h}`} onPointerDown={(e) => startDrag(e, selected, 'resize')} />
          ))}
        </div>
      )}
    </div>
  );
}
