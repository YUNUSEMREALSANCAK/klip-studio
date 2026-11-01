import { clearSession, importKlip } from '../core/persistence';
import { useEditor } from '../core/store';

export const isKlipFile = (file: File) => file.name.toLowerCase().endsWith('.klip');

// Replaces the current project with a .klip file. Errors show as a task card.
export async function openKlip(file: Blob) {
  const s = useEditor.getState();
  const task = s.startTask('Opening project');
  try {
    const { project, assets } = await importKlip(file);
    await clearSession();
    s.loadProject(project, assets);
    s.endTask(task);
  } catch (error) {
    s.updateTask(task, { error: (error as Error).message });
    setTimeout(() => s.endTask(task), 6000);
  }
}

// Opens the project named by ?klip=<path> (same origin only, e.g. a file served by the dev server),
// then removes the parameter so a reload doesn't open it again.
export async function openKlipFromUrl() {
  const url = new URL(window.location.href);
  const target = url.searchParams.get('klip');
  if (!target) return;
  url.searchParams.delete('klip');
  window.history.replaceState(null, '', url);
  const source = new URL(target, window.location.href);
  if (source.origin !== window.location.origin) return;
  const s = useEditor.getState();
  const task = s.startTask('Opening project');
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not load project: ${source.pathname}`);
    const blob = await response.blob();
    s.endTask(task);
    await openKlip(blob);
  } catch (error) {
    s.updateTask(task, { error: (error as Error).message });
    setTimeout(() => s.endTask(task), 6000);
  }
}
