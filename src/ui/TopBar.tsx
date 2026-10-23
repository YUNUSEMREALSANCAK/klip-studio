import { tr, useLang, type Lang } from '../i18n';
import { useRef } from 'react';
import { clearSession, exportKlip, importKlip } from '../core/persistence';
import { useEditor } from '../core/store';
import type { AspectRatio } from '../core/types';
import { Icon } from './icons';
import type { SaveStatus } from './useAutosave';
import { useUi } from './uiStore';

const ASPECTS: { id: AspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9 YouTube' },
  { id: '9:16', label: '9:16 Reels / TikTok' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Post' },
];

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save',
};

function download(blob: Blob, name: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

async function saveKlip() {
  const { project, assets, startTask, endTask } = useEditor.getState();
  const task = startTask('Preparing project file');
  try {
    download(await exportKlip(project, assets), 'project.klip');
  } finally {
    endTask(task);
  }
}

async function openKlip(file: File) {
  const s = useEditor.getState();
  try {
    const { project, assets } = await importKlip(file);
    await clearSession();
    s.loadProject(project, assets);
  } catch (error) {
    const task = s.startTask('Could not open project');
    s.updateTask(task, { error: (error as Error).message });
    setTimeout(() => s.endTask(task), 6000);
  }
}

async function newProject() {
  if (useEditor.getState().project.clips.length && !confirm(tr('Discard the current project? You may want to save it as a .klip file first.'))) return;
  await clearSession();
  useEditor.getState().newProject();
}

export function TopBar({ saveStatus }: { saveStatus: SaveStatus }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { lang, setLang } = useLang();
  const aspect = useEditor((s) => s.project.aspect);
  const setAspect = useEditor((s) => s.setAspect);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const hasClips = useEditor((s) => s.project.clips.length > 0);
  const setExportOpen = useUi((s) => s.setExportOpen);

  return (
    <header className="topbar">
      <div className="brand">{tr('Klip Studio')}</div>
      <button className="btn ghost icon" title={tr('Undo (⌘Z)')} disabled={!canUndo} onClick={() => useEditor.getState().undo()}>
        <Icon name="undo" />
      </button>
      <button className="btn ghost icon" title={tr('Redo (⇧⌘Z)')} disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Icon name="redo" />
      </button>
      <div className="divider" />
      <button className="btn ghost small" onClick={() => void newProject()}>
        {tr('New')}
      </button>
      <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
        {tr('Open')}
      </button>
      <button className="btn ghost small" disabled={!hasClips} onClick={() => void saveKlip()} title={tr('Download as a .klip project file')}>
        {tr('Save')}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".klip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openKlip(file);
          e.target.value = '';
        }}
      />
      <span className={`save-status ${saveStatus}`}>{tr(STATUS_TEXT[saveStatus])}</span>
      <div className="spacer" />
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} title="Language" style={{ width: 70 }}>
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
      <select value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)} title={tr('Aspect ratio')}>
        {ASPECTS.map((a) => (
          <option key={a.id} value={a.id}>
            {tr(a.label)}
          </option>
        ))}
      </select>
      <button className="btn primary" disabled={!hasClips} onClick={() => setExportOpen(true)}>
        <Icon name="export" size={16} /> {tr('Export')}
      </button>
    </header>
  );
}
