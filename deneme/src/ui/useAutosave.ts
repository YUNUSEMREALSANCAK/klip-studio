import { useEffect, useState } from 'react';
import { loadSession, saveAsset, saveProject } from '../core/persistence';
import { useEditor } from '../core/store';

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

const DEBOUNCE_MS = 700;

// Restores the last session on startup, then saves every change to IndexedDB.
export function useAutosave(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('loading');

  useEffect(() => {
    let timer = 0;
    let dirty = false;
    let unsubscribe = () => {};
    let cancelled = false;
    const savedAssets = new Set<string>();

    const persist = async () => {
      dirty = false;
      const { project, assets } = useEditor.getState();
      setStatus('saving');
      try {
        for (const asset of Object.values(assets)) {
          if (savedAssets.has(asset.id)) continue;
          await saveAsset(asset);
          savedAssets.add(asset.id);
        }
        await saveProject(project);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    };

    // If the store is already populated (e.g. UI remounted after a language change), don't reload the session.
    const current = useEditor.getState();
    const alreadyOpen = current.project.clips.length > 0 || Object.keys(current.assets).length > 0;
    if (alreadyOpen) Object.keys(current.assets).forEach((id) => savedAssets.add(id));
    (alreadyOpen ? Promise.resolve(null) : loadSession())
      .then((session) => {
        if (cancelled) return;
        if (session) {
          useEditor.getState().loadProject(session.project, session.assets);
          Object.keys(session.assets).forEach((id) => savedAssets.add(id));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setStatus('saved');
        unsubscribe = useEditor.subscribe((state, previous) => {
          if (state.project === previous.project && state.assets === previous.assets) return;
          // A new project or a loaded .klip replaces the asset list; reset the saved set.
          if (Object.keys(state.assets).length < savedAssets.size) savedAssets.clear();
          window.clearTimeout(timer);
          dirty = true;
          timer = window.setTimeout(() => void persist(), DEBOUNCE_MS);
        });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (dirty) void persist(); // don't lose a pending change
      unsubscribe();
    };
  }, []);

  return status;
}
