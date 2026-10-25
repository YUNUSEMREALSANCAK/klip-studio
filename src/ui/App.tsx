import { tr, useLang } from '../i18n';
import { useEffect, useState, type CSSProperties } from 'react';
import { installWindowApi, startBridgeIfEnabled } from '../agent/bridge';
import { useEditor } from '../core/store';
import { registerProjectFonts } from '../render/fonts';
import { ExportDialog } from './ExportDialog';
import { Inspector } from './Inspector';
import { ObjectEditor } from './ObjectEditor';
import { Preview } from './Preview';
import { SidePanel } from './SidePanel';
import { TaskToasts } from './TaskToasts';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';
import { missingFeatures } from './compat';
import { ErrorBoundary } from './ErrorBoundary';
import { AppliedPanel } from './AppliedPanel';
import { appliedItems } from '../core/applied';
import { COLLAPSED_WIDTH, usePanels } from './panelSizes';
import { Splitter } from './Splitter';
import { useAutosave } from './useAutosave';
import { useUi } from './uiStore';

function useShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const s = useEditor.getState();
      const mod = event.metaKey || event.ctrlKey;
      const frame = 1 / s.project.fps;
      if (event.code === 'Space') {
        event.preventDefault();
        s.setPlaying(!s.playing);
      } else if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) s.redo();
        else s.undo();
      } else if (event.key.toLowerCase() === 's' || (mod && event.key.toLowerCase() === 'b')) {
        event.preventDefault();
        s.splitAtPlayhead();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && s.selectedId) {
        s.removeClip(s.selectedId);
      } else if (event.key === 'ArrowLeft') {
        s.setTime(s.time - (event.shiftKey ? 1 : frame));
      } else if (event.key === 'ArrowRight') {
        s.setTime(s.time + (event.shiftKey ? 1 : frame));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  // Changing the language remounts the UI; project state lives in the store, so it survives.
  const lang = useLang((s) => s.lang);
  return (
    <ErrorBoundary>
      <Editor key={lang} />
    </ErrorBoundary>
  );
}

function Editor() {
  useShortcuts();
  useEffect(() => {
    installWindowApi();
    startBridgeIfEnabled();
  }, []);
  const fonts = useEditor((s) => s.project.fonts);
  useEffect(() => {
    void registerProjectFonts(fonts);
  }, [fonts]);
  const saveStatus = useAutosave();
  const sizes = usePanels((s) => s.sizes);
  const appliedCollapsed = usePanels((s) => s.appliedCollapsed);
  const hasApplied = useEditor((s) => appliedItems(s.project).length > 0);
  const appliedColumns = !hasApplied ? '' : appliedCollapsed ? `${COLLAPSED_WIDTH}px` : '1px var(--applied-w)';
  // Re-fit the panels when the window shrinks so the stage keeps its minimum size.
  useEffect(() => {
    const refit = () => {
      const { sizes, resize } = usePanels.getState();
      (Object.keys(sizes) as (keyof typeof sizes)[]).forEach((panel) => resize(panel, sizes[panel]));
    };
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, []);
  const [missing] = useState(missingFeatures);
  const objectClipId = useUi((s) => s.objectEditorClipId);
  const exportOpen = useUi((s) => s.exportOpen);

  return (
    <div
      className="app"
      style={
        {
          '--side-w': `${sizes.side}px`,
          '--inspector-w': `${sizes.inspector}px`,
          '--applied-w': `${sizes.applied}px`,
          '--timeline-h': `${sizes.timeline}px`,
        } as CSSProperties
      }
    >
      <div>
        {missing.length > 0 && (
          <div className="compat">
            {tr('Your browser is missing:')} {missing.map(tr).join(', ')}. {tr('A recent Chrome or Edge is recommended.')}
          </div>
        )}
      </div>
      <TopBar saveStatus={saveStatus} />
      <div className="workspace" style={{ gridTemplateColumns: `var(--side-w) 1px minmax(0, 1fr) ${appliedColumns} 1px var(--inspector-w)` }}>
        <SidePanel />
        <Splitter panel="side" grows={1} />
        <Preview />
        {hasApplied && !appliedCollapsed && <Splitter panel="applied" grows={-1} />}
        {hasApplied && <AppliedPanel />}
        <Splitter panel="inspector" grows={-1} />
        <Inspector />
      </div>
      <Splitter panel="timeline" grows={-1} />
      <Timeline />
      <TaskToasts />
      {objectClipId && <ObjectEditor clipId={objectClipId} />}
      {exportOpen && <ExportDialog />}
    </div>
  );
}
