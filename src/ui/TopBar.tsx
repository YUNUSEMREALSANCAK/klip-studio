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
  { id: '1:1', label: '1:1 Kare' },
  { id: '4:5', label: '4:5 Gönderi' },
];

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: 'Yükleniyor…',
  saving: 'Kaydediliyor…',
  saved: 'Kaydedildi',
  error: 'Kaydedilemedi',
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
  const task = startTask('Proje dosyası hazırlanıyor');
  try {
    download(await exportKlip(project, assets), 'proje.klip');
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
    const task = s.startTask('Proje açılamadı');
    s.updateTask(task, { error: (error as Error).message });
    setTimeout(() => s.endTask(task), 6000);
  }
}

async function newProject() {
  if (useEditor.getState().project.clips.length && !confirm('Mevcut proje silinsin mi? Önce .klip olarak kaydetmek isteyebilirsiniz.')) return;
  await clearSession();
  useEditor.getState().newProject();
}

export function TopBar({ saveStatus }: { saveStatus: SaveStatus }) {
  const fileRef = useRef<HTMLInputElement>(null);
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
      <div className="divider" />
      <button className="btn ghost small" onClick={() => void newProject()}>
        Yeni
      </button>
      <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
        Aç
      </button>
      <button className="btn ghost small" disabled={!hasClips} onClick={() => void saveKlip()} title=".klip proje dosyası olarak indir">
        Kaydet
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
      <span className={`save-status ${saveStatus}`}>{STATUS_TEXT[saveStatus]}</span>
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
