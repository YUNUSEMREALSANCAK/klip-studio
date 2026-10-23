import { useEffect, useState } from 'react';
import { loadSession, saveAsset, saveProject } from '../core/persistence';
import { useEditor } from '../core/store';

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

const DEBOUNCE_MS = 700;

// Açılışta son oturumu geri yükler, sonra her değişikliği IndexedDB'ye kaydeder.
export function useAutosave(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('loading');

  useEffect(() => {
    let timer = 0;
    let unsubscribe = () => {};
    let cancelled = false;
    const savedAssets = new Set<string>();

    const persist = async () => {
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

    loadSession()
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
          // Yeni proje veya .klip yüklemesi varlık listesini değiştirir; kayıt kümesini sıfırla.
          if (Object.keys(state.assets).length < savedAssets.size) savedAssets.clear();
          window.clearTimeout(timer);
          timer = window.setTimeout(() => void persist(), DEBOUNCE_MS);
        });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return status;
}
