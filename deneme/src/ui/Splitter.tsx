import type { KeyboardEvent, PointerEvent } from 'react';
import { tr } from '../i18n';
import { usePanels, type Panel } from './panelSizes';

const LABELS: Record<Panel, string> = {
  side: 'Resize left panel',
  applied: 'Resize applied effects panel',
  inspector: 'Resize right panel',
  timeline: 'Resize timeline',
};

// Drag handle between two panels. grows = 1 when dragging right/down makes the panel bigger, -1 otherwise.
// Double-click restores the default size; arrow keys resize in 16 px steps.
export function Splitter({ panel, grows }: { panel: Panel; grows: 1 | -1 }) {
  const vertical = panel !== 'timeline';
  const { resize, reset } = usePanels.getState();

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const start = vertical ? event.clientX : event.clientY;
    const startSize = usePanels.getState().sizes[panel];
    document.body.classList.add(vertical ? 'resizing-x' : 'resizing-y');
    const onMove = (e: globalThis.PointerEvent) => resize(panel, startSize + ((vertical ? e.clientX : e.clientY) - start) * grows);
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('resizing-x', 'resizing-y');
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = vertical ? { ArrowRight: 1, ArrowLeft: -1 } : { ArrowDown: 1, ArrowUp: -1 };
    const step = keys[event.key as keyof typeof keys];
    if (!step) return;
    event.preventDefault();
    resize(panel, usePanels.getState().sizes[panel] + step * grows * 16);
  };

  return (
    <div
      className={`splitter ${vertical ? 'vertical' : 'horizontal'}`}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={tr(LABELS[panel])}
      title={tr('Drag to resize · double-click to reset')}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => reset(panel)}
      onKeyDown={onKeyDown}
    />
  );
}
