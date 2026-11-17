import { create } from 'zustand';

interface UiState {
  objectEditorClipId: string | null;
  exportOpen: boolean;
  openObjectEditor: (clipId: string | null) => void;
  setExportOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  objectEditorClipId: null,
  exportOpen: false,
  openObjectEditor: (objectEditorClipId) => set({ objectEditorClipId }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
