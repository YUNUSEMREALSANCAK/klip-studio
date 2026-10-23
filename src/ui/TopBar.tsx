import { useEditor } from '../core/store';
import type { AspectRatio } from '../core/types';
import { Icon } from './icons';
import { useUi } from './uiStore';

const ASPECTS: { id: AspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9 YouTube' },
  { id: '9:16', label: '9:16 Reels / TikTok' },
  { id: '1:1', label: '1:1 Kare' },
  { id: '4:5', label: '4:5 Gönderi' },
];

export function TopBar() {
  const aspect = useEditor((s) => s.project.aspect);
  const setAspect = useEditor((s) => s.setAspect);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const hasClips = useEditor((s) => s.project.clips.length > 0);
  const setExportOpen = useUi((s) => s.setExportOpen);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-dot" />
        Klip Stüdyo
      </div>
      <button className="btn ghost icon" title="Geri al (⌘Z)" disabled={!canUndo} onClick={() => useEditor.getState().undo()}>
        <Icon name="undo" />
      </button>
      <button className="btn ghost icon" title="Yinele (⇧⌘Z)" disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Icon name="redo" />
      </button>
      <div className="spacer" />
      <select value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)} title="En-boy oranı">
        {ASPECTS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
      <button className="btn primary" disabled={!hasClips} onClick={() => setExportOpen(true)}>
        <Icon name="export" size={16} /> Dışa aktar
      </button>
    </header>
  );
}
