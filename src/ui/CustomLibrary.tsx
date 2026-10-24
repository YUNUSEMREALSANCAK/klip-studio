import { useRef, useState } from 'react';
import { useEditor } from '../core/store';
import type { CustomEffect } from '../core/types';
import { tr, trMessage } from '../i18n';
import { FONT_FILE_TYPES } from '../render/fonts';
import { addFontFile, addGoogleFont, removeFont } from './customActions';
import { EffectEditor } from './EffectEditor';
import { Icon } from './icons';

const LABELS = {
  transition: { title: 'Custom transitions', add: '+ New transition' },
  filter: { title: 'Custom filters', add: '+ New filter' },
};

// The project's custom transitions or filters as tiles, with an editor for creating and changing them.
export function CustomEffects({
  kind,
  activeId,
  disabled,
  onApply,
}: {
  kind: CustomEffect['kind'];
  activeId?: string;
  disabled: boolean;
  onApply: (id: string) => void;
}) {
  const effects = useEditor((s) => s.project.effects);
  const [editing, setEditing] = useState<CustomEffect | 'new' | null>(null);
  const list = Object.values(effects).filter((e) => e.kind === kind);
  return (
    <>
      <div className="section-title" style={{ marginTop: 18 }}>
        {tr(LABELS[kind].title)}
      </div>
      <p className="hint">{tr('Write your own in GLSL, or describe one to an AI app connected over MCP.')}</p>
      <div className="tile-grid" style={{ marginTop: 8 }}>
        {list.map((effect) => (
          <div key={effect.id} className={`tile custom-tile ${activeId === effect.id ? 'active' : ''}`}>
            <button className="custom-tile-main" disabled={disabled} onClick={() => onApply(effect.id)}>
              {effect.name}
            </button>
            <button className="custom-tile-edit" title={tr('Edit')} aria-label={`${tr('Edit')} ${effect.name}`} onClick={() => setEditing(effect)}>
              <Icon name="edit" size={14} />
            </button>
          </div>
        ))}
        <button className="tile" onClick={() => setEditing('new')}>
          {tr(LABELS[kind].add)}
        </button>
      </div>
      {editing && (
        <EffectEditor
          kind={kind}
          effect={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => editing === 'new' && !disabled && onApply(id)}
        />
      )}
    </>
  );
}

// Fonts added to the project: uploaded files or any Google Fonts family by name.
export function CustomFonts() {
  const fonts = useEditor((s) => s.project.fonts);
  const [family, setFamily] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setFamily('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-title" style={{ marginTop: 18 }}>
        {tr('Fonts')}
      </div>
      <p className="hint">{tr('Upload a font file or add any Google Fonts family by name.')}</p>
      <form
        className="row"
        style={{ gap: 6, marginTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => addGoogleFont(family));
        }}
      >
        <input type="text" value={family} placeholder="Space Grotesk" aria-label={tr('Google Fonts family')} onChange={(e) => setFamily(e.target.value)} />
        <button className="btn small" style={{ flex: 'none' }} disabled={busy || !family.trim()}>
          {tr('Add')}
        </button>
      </form>
      <button className="btn small" style={{ marginTop: 6 }} disabled={busy} onClick={() => fileInput.current?.click()}>
        <Icon name="upload" size={14} /> {tr('Upload font file')}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={FONT_FILE_TYPES}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void run(() => addFontFile(file, file.name));
        }}
      />
      {error && <p className="hint error-text">{trMessage(error)}</p>}
      {Object.keys(fonts).length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {Object.values(fonts).map((f) => (
            <span key={f.family} className="chip" style={{ fontFamily: `"${f.family}", Inter` }}>
              {f.family}{' '}
              <button className="chip-remove" title={tr('Remove')} aria-label={`${tr('Remove')} ${f.family}`} onClick={() => removeFont(f.family)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
