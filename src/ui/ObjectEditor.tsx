import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cutout, imageDataToBlob, inpaint, SamClient, type BinaryMask, type SamPoint } from '../ai/objectTools';
import { useEditor } from '../core/store';
import { createMediaClip } from '../core/timeline';
import { DEFAULT_TRANSFORM, type Asset, type MediaClip } from '../core/types';
import { createAsset } from '../media/importMedia';
import { clipSourceTime } from '../render/composeFrame';
import { Icon } from './icons';
import { useUi } from './uiStore';

const MAX_SIZE = 1600;

async function loadFrame(asset: Asset, time: number): Promise<ImageData> {
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  if (asset.kind === 'image') {
    const bitmap = await createImageBitmap(asset.file);
    [source, width, height] = [bitmap, bitmap.width, bitmap.height];
  } else {
    const input = new Input({ source: new BlobSource(asset.file), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Video karesi okunamadı');
    const frame = await new CanvasSink(track).getCanvas(time);
    if (!frame) throw new Error('Video karesi okunamadı');
    [source, width, height] = [frame.canvas, frame.canvas.width, frame.canvas.height];
  }
  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  const canvas = new OffscreenCanvas(Math.round(width * scale), Math.round(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function combine(sam: BinaryMask | null, brush: Uint8Array | null, width: number, height: number): BinaryMask {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = (sam?.data[i] ?? 0) | (brush?.[i] ?? 0);
  return { data, width, height };
}

export function ObjectEditor({ clipId }: { clipId: string }) {
  const close = () => useUi.getState().openObjectEditor(null);
  const clip = useEditor((s) => s.project.clips.find((c) => c.id === clipId)) as MediaClip | undefined;
  const asset = useEditor((s) => (clip ? s.assets[clip.assetId] : undefined));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samRef = useRef<SamClient | null>(null);
  const brushRef = useRef<Uint8Array | null>(null);
  const painting = useRef(false);

  const [image, setImage] = useState<ImageData | null>(null);
  const [status, setStatus] = useState<{ message: string; progress: number } | null>({ message: 'Kare yükleniyor', progress: -1 });
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<SamPoint[]>([]);
  const [samMask, setSamMask] = useState<BinaryMask | null>(null);
  const [mode, setMode] = useState<'click' | 'brush'>('click');
  const [brushSize, setBrushSize] = useState(24);
  const [revision, setRevision] = useState(0); // fırça boyandıkça yeniden çiz

  // Kareyi yükle ve SAM gömmesini (embedding) hesapla.
  useEffect(() => {
    if (!clip || !asset) return;
    const sam = new SamClient();
    samRef.current = sam;
    sam.onProgress = (message, progress) => setStatus({ message, progress });
    const { time: now, assets } = useEditor.getState();
    const inside = Math.min(Math.max(now, clip.start), clip.start + clip.duration - 0.01);
    let alive = true;
    (async () => {
      const frame = await loadFrame(asset, clipSourceTime(clip, inside, assets));
      if (!alive) return;
      setImage(frame);
      brushRef.current = new Uint8Array(frame.width * frame.height);
      await sam.embed(frame);
      if (!alive) return;
      setReady(true);
      setStatus(null);
    })().catch((error) => alive && setStatus({ message: `Hata: ${error.message}`, progress: 0 }));
    return () => {
      alive = false;
      sam.dispose();
    };
    // Pencere açıkken klip değişmez; yalnızca açılışta çalışır.
  }, []);

  // Görsel + maske + noktaları çiz.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(image, 0, 0);
    const mask = combine(samMask, brushRef.current, image.width, image.height);
    const overlay = ctx.createImageData(image.width, image.height);
    for (let i = 0; i < mask.data.length; i++) {
      if (!mask.data[i]) continue;
      overlay.data.set([34, 211, 238, 130], i * 4);
    }
    const layer = new OffscreenCanvas(image.width, image.height);
    layer.getContext('2d')!.putImageData(overlay, 0, 0);
    ctx.drawImage(layer, 0, 0);
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * image.width, p.y * image.height, Math.max(6, image.width / 150), 0, Math.PI * 2);
      ctx.fillStyle = p.positive ? '#22c55e' : '#ef4444';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
  }, [image, samMask, points, revision]);

  const toImageCoords = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };

  const paint = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!image || !brushRef.current) return;
    const { x, y } = toImageCoords(event);
    const cx = x * image.width;
    const cy = y * image.height;
    const r = (brushSize * image.width) / 800;
    for (let py = Math.max(0, Math.floor(cy - r)); py < Math.min(image.height, cy + r); py++) {
      for (let px = Math.max(0, Math.floor(cx - r)); px < Math.min(image.width, cx + r); px++) {
        if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) brushRef.current[py * image.width + px] = 1;
      }
    }
    setRevision((n) => n + 1);
  };

  const onPointerDown = async (event: PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    if (mode === 'brush') {
      painting.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      paint(event);
      return;
    }
    const positive = event.button !== 2 && !event.altKey;
    const next = [...points, { ...toImageCoords(event), positive }];
    setPoints(next);
    setStatus({ message: 'Nesne seçiliyor', progress: -1 });
    try {
      setSamMask(await samRef.current!.decode(next));
      setStatus(null);
    } catch (error) {
      setStatus({ message: `Hata: ${(error as Error).message}`, progress: 0 });
    }
  };

  const reset = () => {
    setPoints([]);
    setSamMask(null);
    brushRef.current?.fill(0);
    setRevision((n) => n + 1);
  };

  const finalMask = () => (image ? combine(samMask, brushRef.current, image.width, image.height) : null);
  const hasSelection = !!samMask || (brushRef.current?.some((v) => v) ?? false);

  const addResult = async (blob: Blob, name: string, replace: boolean) => {
    if (!clip || !asset) return;
    const s = useEditor.getState();
    const created = await createAsset(blob, name);
    s.addAsset(created);
    if (replace && asset.kind === 'image') {
      s.updateClip(clip.id, { assetId: created.id } as Partial<MediaClip>);
    } else {
      const overlay = createMediaClip(created, 'overlay', Math.max(s.time, clip.start));
      const fullFrame = replace ? { transform: { ...DEFAULT_TRANSFORM } } : {};
      s.mutate((clips) => [...clips, { ...overlay, duration: Math.min(4, clip.duration), ...fullFrame }]);
    }
    close();
  };

  const removeObject = async () => {
    const mask = finalMask();
    if (!image || !mask) return;
    setStatus({ message: 'Nesne siliniyor', progress: -1 });
    await new Promise((r) => setTimeout(r, 30)); // durum mesajı ekrana çizilsin
    const cleaned = inpaint(image, mask);
    await addResult(await imageDataToBlob(cleaned), `${asset?.name ?? 'kare'} (temizlenmiş).png`, true);
  };

  const cutObject = async () => {
    const mask = finalMask();
    if (!image || !mask) return;
    await addResult(await cutout(image, mask), `${asset?.name ?? 'nesne'} (kesilmiş).png`, false);
  };

  if (!clip || !asset) return null;

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <header>
          <h3>Nesne seç ve sil</h3>
          <button className="btn ghost icon" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body object-layout">
          <div className="object-canvas">
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => void onPointerDown(e)}
              onPointerMove={(e) => painting.current && paint(e)}
              onPointerUp={() => (painting.current = false)}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
          <div>
            <div className="chips" style={{ marginBottom: 12 }}>
              <button className={`chip ${mode === 'click' ? 'active' : ''}`} onClick={() => setMode('click')}>
                Tıklayarak seç (AI)
              </button>
              <button className={`chip ${mode === 'brush' ? 'active' : ''}`} onClick={() => setMode('brush')}>
                Fırça
              </button>
            </div>
            {mode === 'click' ? (
              <p className="hint">
                Nesneye tıklayın. Seçimden çıkarmak için Alt + tık veya sağ tık kullanın. Model: SlimSAM (Segment Anything).
              </p>
            ) : (
              <div className="field">
                <label>
                  Fırça boyutu <span>{brushSize}</span>
                </label>
                <input type="range" min={6} max={80} value={brushSize} onChange={(e) => setBrushSize(+e.target.value)} />
                <p className="hint">Yazı, logo veya küçük lekeleri boyayarak işaretleyin.</p>
              </div>
            )}
            {status && (
              <div style={{ margin: '12px 0' }}>
                <div className="task-msg">{status.message}</div>
                <div className={`progress ${status.progress < 0 ? 'indeterminate' : ''}`}>
                  <div style={{ width: `${Math.max(status.progress, 0) * 100}%` }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button className="btn primary block" disabled={!hasSelection} onClick={() => void removeObject()}>
                Nesneyi sil (görseli temizle)
              </button>
              <button className="btn block" disabled={!hasSelection} onClick={() => void cutObject()}>
                Nesneyi kes → çıkartma olarak ekle
              </button>
              <button className="btn ghost block" onClick={reset}>
                Seçimi temizle
              </button>
            </div>
            {asset.kind === 'video' && (
              <p className="hint" style={{ marginTop: 12 }}>
                Video klipte oynatma çizgisindeki kare kullanılır. Temizlenmiş kare üst katmana görsel olarak eklenir.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
