import { useState, type KeyboardEvent } from 'react';
import type { CustomEffect } from '../core/types';
import { tr, trMessage } from '../i18n';
import { FILTER_API, FILTER_TEMPLATE, TRANSITION_API, TRANSITION_TEMPLATE } from '../render/effects';
import { deleteEffect, saveEffect } from './customActions';
import { Icon } from './icons';

const TITLES = {
  transition: { create: 'New transition', edit: 'Edit transition' },
  filter: { create: 'New filter', edit: 'Edit filter' },
};

// Tab indents instead of leaving the textarea.
function indentOnTab(event: KeyboardEvent<HTMLTextAreaElement>, setCode: (code: string) => void) {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  const area = event.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = area;
  setCode(value.slice(0, start) + '  ' + value.slice(end));
  requestAnimationFrame(() => area.setSelectionRange(start + 2, start + 2));
}

// Code editor for a custom GLSL transition or filter; it's compiled on save and errors are shown inline.
export function EffectEditor({
  kind,
  effect,
  onClose,
  onSaved,
}: {
  kind: CustomEffect['kind'];
  effect?: CustomEffect;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [name, setName] = useState(effect?.name ?? '');
  const [code, setCode] = useState(effect?.code ?? (kind === 'transition' ? TRANSITION_TEMPLATE : FILTER_TEMPLATE));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    try {
      const id = saveEffect({ id: effect?.id, kind, name, code });
      onSaved?.(id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal effect-modal">
        <header>
          <h3>{tr(TITLES[kind][effect ? 'edit' : 'create'])}</h3>
          <button className="btn ghost icon" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="effect-name">{tr('Name')}</label>
            <input
              id="effect-name"
              type="text"
              value={name}
              placeholder={tr(kind === 'transition' ? 'Custom transition' : 'Custom filter')}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="effect-code">{tr('GLSL code')}</label>
            <textarea
              id="effect-code"
              className="code-editor"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => indentOnTab(e, setCode)}
            />
          </div>
          {error && <pre className="code-error">{trMessage(error)}</pre>}
          <p className="hint">{(kind === 'transition' ? TRANSITION_API : FILTER_API).replace(/`/g, '')}</p>
          <p className="hint">{tr('Tip: describe the effect to an AI app connected over MCP and it can write this code for you.')}</p>
        </div>
        <footer>
          {effect && (
            <button
              className="btn"
              style={{ marginRight: 'auto' }}
              onClick={() => {
                deleteEffect(effect.id);
                onClose();
              }}
            >
              {tr('Delete')}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            {tr('Cancel')}
          </button>
          <button className="btn primary" onClick={save}>
            {tr('Save')}
          </button>
        </footer>
      </div>
    </div>
  );
}
