import { tr } from '../i18n';
import { selectedClip, useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import type { TextAnimation, TextClip, TextStylePreset } from '../core/types';
import { familyOf, fontFamilies } from '../render/fonts';
import { Section, Slider, Toggle } from './controls';
import { Icon } from './icons';
import { MediaInspector } from './MediaInspector';
import { AgentConnection } from './AgentConnection';

export function Inspector() {
  const clip = useEditor(selectedClip);
  return (
    <aside className="inspector">
      {!clip && <ProjectSettings />}
      {clip?.type === 'media' && <MediaInspector clip={clip} />}
      {clip?.type === 'text' && <TextInspector clip={clip} />}
    </aside>
  );
}

function ProjectSettings() {
  const background = useEditor((s) => s.project.background);
  const blur = useEditor((s) => s.project.backgroundBlur);
  return (
    <>
      <h3>{tr('Project')}</h3>
      <div className="sub">{tr('Select a clip to edit its properties.')}</div>
      <div className="toggle">
        <span>{tr('Background color')}</span>
        <input type="color" value={background} onChange={(e) => useEditor.setState((s) => ({ project: { ...s.project, background: e.target.value } }))} />
      </div>
      <Toggle
        label={tr('Fill gaps with blur')}
        on={blur}
        onChange={(backgroundBlur) => {
          useEditor.getState().checkpoint();
          useEditor.setState((s) => ({ project: { ...s.project, backgroundBlur } }));
        }}
      />
      <div className="hint">{tr('When a landscape clip is placed in a vertical project, the edges are filled with a blurred copy.')}</div>
      <AgentConnection />
      <div className="section-title" style={{ marginTop: 16 }}>
        {tr('Shortcuts')}
      </div>
      <div className="hint">
        {tr('Space — play / pause')}
        <br />
        {tr('S or ⌘B — split')}
        <br />
        {tr('Delete — remove clip')}
        <br />
        {tr('⌘Z / ⇧⌘Z — undo / redo')}
        <br />
        {tr('← → — step one frame (⇧ for 1 s)')}
      </div>
    </>
  );
}

const PRESETS: { id: TextStylePreset; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'box', label: 'Boxed' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'neon', label: 'Neon' },
  { id: 'title', label: 'Title' },
];

const ANIMATIONS: { id: TextAnimation; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'pop', label: 'Pop' },
  { id: 'slideup', label: 'Slide up' },
  { id: 'typewriter', label: 'Typewriter' },
];

function TextInspector({ clip }: { clip: TextClip }) {
  const fonts = useEditor((s) => s.project.fonts);
  const update = (patch: Partial<TextClip>, record = false) => useEditor.getState().updateClip(clip.id, patch, record);
  const checkpoint = () => useEditor.getState().checkpoint();
  return (
    <>
      <h3>{tr('Text')}</h3>
      <div className="sub">
        {formatTime(clip.start)} · {formatTime(clip.duration)}
      </div>
      <div className="field">
        <textarea
          rows={3}
          value={clip.text}
          onFocus={checkpoint}
          // Word timings of a hand-edited caption are no longer valid.
          onChange={(e) => update({ text: e.target.value, words: e.target.value.split(/\s+/).length === clip.words?.length ? clip.words : undefined })}
        />
      </div>
      <Section title={tr('Style')}>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.id} className={`chip ${clip.preset === p.id ? 'active' : ''}`} onClick={() => update({ preset: p.id }, true)}>
              {tr(p.label)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={tr('Animation')}>
        <div className="chips">
          {ANIMATIONS.map((a) => (
            <button key={a.id} className={`chip ${clip.animation === a.id ? 'active' : ''}`} onClick={() => update({ animation: a.id }, true)}>
              {tr(a.label)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={tr('Appearance')}>
        <div className="field">
          <label>{tr('Font')}</label>
          <select value={familyOf(clip)} onChange={(e) => update({ font: e.target.value }, true)}>
            {fontFamilies(fonts).map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="toggle">
          <span>{tr('Color')}</span>
          <input type="color" value={clip.color} onFocus={checkpoint} onChange={(e) => update({ color: e.target.value })} />
        </div>
        <div className="toggle">
          <span>{tr('Highlight color')}</span>
          <input type="color" value={clip.highlight} onFocus={checkpoint} onChange={(e) => update({ highlight: e.target.value })} />
        </div>
        <Slider
          label={tr('Font size')}
          value={clip.fontSize}
          min={0.02}
          max={0.2}
          step={0.005}
          onCommit={checkpoint}
          onChange={(fontSize) => update({ fontSize })}
        />
        <Slider label={tr('Vertical position')} value={clip.y} min={0.05} max={0.95} onCommit={checkpoint} onChange={(y) => update({ y })} />
      </Section>
      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> {tr('Delete text')}
        </button>
      </div>
    </>
  );
}
