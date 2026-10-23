import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditor } from '../core/store';
import { formatTime, projectDuration } from '../core/timeline';
import { ASPECT_SIZES } from '../core/types';
import { PreviewEngine } from '../render/previewEngine';
import { Icon } from './icons';
import { StageEditor } from './StageEditor';

const PREVIEW_MAX = 1280; // önizleme çözünürlüğü; dışa aktarma tam çözünürlükte yapılır

function usePlaybackLoop(engineRef: React.RefObject<PreviewEngine | null>) {
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const s = useEditor.getState();
      const duration = projectDuration(s.project.clips);
      if (s.playing) {
        const next = s.time + (now - last) / 1000;
        const end = Math.min(duration, s.stopAt ?? Infinity);
        if (next >= end) {
          s.setPlaying(false);
          s.setTime(end);
        } else {
          s.setTime(next);
        }
      }
      last = now;
      const current = useEditor.getState();
      engineRef.current?.tick(current.project, current.assets, current.time, current.playing);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);
}

// Sahneyi kutuya sığdırır. Ölçüm ilk boyamadan önce yapılır, böylece oran değişince tek kare bile bozulmaz.
function useFitSize(aspect: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      const style = getComputedStyle(element);
      const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const w = Math.floor(Math.max(0, Math.min(width, height * aspect)));
      setSize((prev) => (prev.width === w ? prev : { width: w, height: Math.floor(w / aspect) }));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect]);
  return { ref, size };
}

export function Preview() {
  const glRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const aspect = useEditor((s) => s.project.aspect);
  const clips = useEditor((s) => s.project.clips);
  const playing = useEditor((s) => s.playing);
  const time = useEditor((s) => s.time);
  const { width, height } = ASPECT_SIZES[aspect];
  const { ref: wrapRef, size } = useFitSize(width / height);

  useEffect(() => {
    engineRef.current = new PreviewEngine(glRef.current!, textRef.current!);
    return () => engineRef.current?.dispose();
  }, []);

  useEffect(() => {
    const scale = Math.min(1, PREVIEW_MAX / Math.max(width, height));
    engineRef.current?.setSize(Math.round(width * scale), Math.round(height * scale));
  }, [width, height]);

  useEffect(() => engineRef.current?.prune(useEditor.getState().project), [clips]);

  usePlaybackLoop(engineRef);

  const duration = projectDuration(clips);

  return (
    <section className="preview">
      <div className="stage-wrap" ref={wrapRef}>
        <div className="stage" style={{ width: size.width, height: size.height }}>
          <canvas ref={glRef} />
          <canvas ref={textRef} />
          <StageEditor width={size.width} height={size.height} />
          <div className="stage-label">
            {aspect} · {width}×{height}
          </div>
          {!clips.length && (
            <div className="empty">
              Soldaki Medya sekmesinden video, ses veya görsel ekleyin.
              <br />
              Tüm yapay zeka özellikleri tarayıcınızda, yerel olarak çalışır.
            </div>
          )}
        </div>
      </div>
      <div className="controls">
        <button className="btn ghost icon" title="Başa dön" onClick={() => useEditor.getState().setTime(0)}>
          ⏮
        </button>
        <button className="btn primary icon" title="Oynat / Duraklat (Boşluk)" onClick={() => useEditor.getState().setPlaying(!playing)}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
        <div className="timecode">
          <b>{formatTime(time)}</b> / {formatTime(duration)}
        </div>
      </div>
    </section>
  );
}
