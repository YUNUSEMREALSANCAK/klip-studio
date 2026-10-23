import { tr, trMessage } from '../i18n';
import { useRef, useState } from 'react';
import { useEditor } from '../core/store';
import { ASPECT_SIZES } from '../core/types';
import { exportVideo } from '../export/exporter';
import { Icon } from './icons';
import { useUi } from './uiStore';

const QUALITIES = [
  { id: 1, label: '1080p (full)' },
  { id: 2 / 3, label: '720p' },
  { id: 4 / 9, label: '480p (fast)' },
];

const even = (n: number) => Math.round(n / 2) * 2;

export function ExportDialog() {
  const close = () => useUi.getState().setExportOpen(false);
  const aspect = useEditor((s) => s.project.aspect);
  const [scale, setScale] = useState(1);
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const size = ASPECT_SIZES[aspect];
  const width = even(size.width * scale);
  const height = even(size.height * scale);

  const start = async () => {
    const { project, assets, setPlaying } = useEditor.getState();
    setPlaying(false);
    setError(null);
    setProgress(0);
    abort.current = new AbortController();
    try {
      const blob = await exportVideo(project, assets, { width, height, fps, onProgress: setProgress, signal: abort.current.signal });
      setResult(URL.createObjectURL(blob));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal narrow">
        <header>
          <h3>{tr('Export')}</h3>
          <button className="btn ghost icon" onClick={() => (abort.current?.abort(), close())}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">
          <div className="field">
            <label>{tr('Resolution')}</label>
            <select value={scale} onChange={(e) => setScale(+e.target.value)} disabled={progress !== null}>
              {QUALITIES.map((q) => (
                <option key={tr(q.label)} value={q.id}>
                  {tr(q.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{tr('Frame rate')}</label>
            <select value={fps} onChange={(e) => setFps(+e.target.value)} disabled={progress !== null}>
              <option value={24}>{tr('24 fps (cinema)')}</option>
              <option value={30}>{tr('30 fps')}</option>
              <option value={60}>{tr('60 fps')}</option>
            </select>
          </div>
          <div className="hint">
            {tr('Output:')} {width}×{height}
            {tr(', MP4. Encoded in your browser with WebCodecs.')}
          </div>
          {progress !== null && (
            <div style={{ marginTop: 16 }}>
              <div className="task-msg">
                {tr('Processing… %')}
                {Math.round(progress * 100)}
              </div>
              <div className="progress">
                <div style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
          {error && <p style={{ color: 'var(--danger)' }}>{trMessage(error)}</p>}
          {result && <video src={result} controls style={{ width: '100%', marginTop: 16, borderRadius: 8, background: '#000' }} />}
        </div>
        <footer>
          {progress !== null ? (
            <button className="btn" onClick={() => abort.current?.abort()}>
              {tr('Cancel')}
            </button>
          ) : result ? (
            <a className="btn primary" href={result} download="klip-studio.mp4">
              <Icon name="export" size={16} /> {tr('Download')}
            </a>
          ) : (
            <button className="btn primary" onClick={() => void start()}>
              {tr('Start export')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
