import { tr } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { selectedClip, useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import type { MediaClip, TextAnimation, TextStylePreset } from '../core/types';
import { importFile, thumbnailOf } from '../media/importMedia';
import { SOUND_EFFECTS } from '../media/soundEffects';
import { FILTER_PRESETS } from '../render/filterPresets';
import { ensureFont, FONTS } from '../render/fonts';
import { TRANSITION_TYPES } from '../render/shaders';
import { AiPanel } from './AiPanel';
import { AssistantPanel } from './AssistantPanel';
import { applyFilterEffect, resolveEffect } from './customActions';
import { CustomEffects, CustomFonts, LibraryEffects } from './CustomLibrary';
import { addSoundEffect, importLut } from './editActions';
import { Icon } from './icons';
import { applyTransition, maxTransitionDuration, targetCut } from './transitions';

type Tab = 'media' | 'text' | 'transition' | 'filter' | 'ai' | 'assistant';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'media', label: 'Media', icon: 'media' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'transition', label: 'Transition', icon: 'transition' },
  { id: 'filter', label: 'Filter', icon: 'filter' },
  { id: 'ai', label: 'AI', icon: 'ai' },
  { id: 'assistant', label: 'Assistant', icon: 'chat' },
];

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('media');
  return (
    <aside className="side">
      <nav className="side-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`side-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={20} />
            {tr(t.label)}
          </button>
        ))}
      </nav>
      <div className="side-body">
        {tab === 'media' && <MediaTab />}
        {tab === 'text' && <TextTab />}
        {tab === 'transition' && <TransitionTab />}
        {tab === 'filter' && <FilterTab />}
        {tab === 'ai' && <AiPanel />}
        {tab === 'assistant' && <AssistantPanel />}
      </div>
    </aside>
  );
}

// Synthesized sound effects, added to the audio track at the playhead.
function SoundEffects() {
  return (
    <>
      <div className="section-title" style={{ marginTop: 18 }}>
        {tr('Sound effects')}
      </div>
      <div className="tile-grid" style={{ marginTop: 8 }}>
        {SOUND_EFFECTS.map((effect) => (
          <button key={effect.id} className="tile" title={tr('Adds it at the playhead')} onClick={() => void addSoundEffect(effect.id)}>
            {tr(effect.label)}
          </button>
        ))}
      </div>
    </>
  );
}

function MediaTab() {
  const assets = useEditor((s) => s.assets);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const addFiles = async (files: FileList | null) => {
    const s = useEditor.getState();
    for (const file of Array.from(files ?? [])) {
      const task = s.startTask(`Importing: ${file.name}`);
      try {
        const asset = await importFile(file);
        s.addAsset(asset);
        s.endTask(task);
      } catch (error) {
        s.updateTask(task, { error: error instanceof Error ? error.message : String(error) });
        setTimeout(() => s.endTask(task), 6000);
      }
    }
  };

  return (
    <>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={22} />
        <div style={{ marginTop: 6 }}>{tr('Drag files here or click')}</div>
        <div className="hint">{tr('Video, audio, image')}</div>
        <input ref={inputRef} type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={(e) => void addFiles(e.target.files)} />
      </div>
      <div className="asset-grid">
        {Object.values(assets).map((asset) => (
          <div
            key={asset.id}
            className="asset"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/asset-id', asset.id)}
            onDoubleClick={() => useEditor.getState().addAssetToTimeline(asset.id)}
            title={tr('Double-click or drag to the timeline')}
          >
            <div className="asset-thumb" style={{ backgroundImage: thumbnailOf(asset) ? `url(${thumbnailOf(asset)})` : undefined }}>
              {!thumbnailOf(asset) && <Icon name="volume" size={26} />}
            </div>
            <span className="asset-badge">{asset.kind === 'video' ? tr('Video') : asset.kind === 'audio' ? tr('Audio') : tr('Image')}</span>
            <div className="asset-actions">
              <button className="btn icon" title={tr('Add to main track')} onClick={() => useEditor.getState().addAssetToTimeline(asset.id)}>
                <Icon name="plus" size={14} />
              </button>
              {asset.kind !== 'audio' && (
                <button
                  className="btn icon"
                  title={tr('Add as overlay (picture in picture)')}
                  onClick={() => useEditor.getState().addAssetToTimeline(asset.id, 'overlay')}
                >
                  ⧉
                </button>
              )}
            </div>
            <div className="asset-name">{asset.name}</div>
          </div>
        ))}
      </div>
      <SoundEffects />
    </>
  );
}

interface TextTemplate {
  label: string;
  text: string;
  preset: TextStylePreset;
  animation: TextAnimation;
  y: number;
  fontSize: number;
  font?: string;
  color?: string;
  highlight?: string;
}

const TEXT_PRESETS: TextTemplate[] = [
  { label: 'Title', text: 'TITLE', preset: 'title', animation: 'pop', y: 0.45, fontSize: 0.12 },
  { label: 'Subtitle', text: 'Subtitle text', preset: 'classic', animation: 'fade', y: 0.82, fontSize: 0.055 },
  { label: 'Boxed', text: 'Boxed text', preset: 'box', animation: 'slideup', y: 0.8, fontSize: 0.05 },
  { label: 'Neon', text: 'NEON', preset: 'neon', animation: 'pop', y: 0.5, fontSize: 0.09, color: '#22d3ee' },
  { label: 'Typewriter', text: 'Typed letter by letter', preset: 'classic', animation: 'typewriter', y: 0.5, fontSize: 0.06, font: 'Roboto Mono' },
  { label: 'Karaoke', text: 'Highlighted word by word', preset: 'karaoke', animation: 'none', y: 0.8, fontSize: 0.06 },
  { label: 'Vlog', text: 'daily vlog', preset: 'classic', animation: 'pop', y: 0.3, fontSize: 0.09, font: 'Pacifico', color: '#fde68a' },
  { label: 'News ticker', text: 'BREAKING NEWS', preset: 'box', animation: 'slideup', y: 0.88, fontSize: 0.05, font: 'Oswald' },
  { label: 'Cinema', text: 'Once upon a time…', preset: 'classic', animation: 'fade', y: 0.5, fontSize: 0.07, font: 'Playfair Display' },
  { label: 'Bold', text: 'WATCH NOW', preset: 'title', animation: 'pop', y: 0.5, fontSize: 0.1, font: 'Anton', color: '#facc15' },
  { label: 'Retro', text: 'Retro', preset: 'neon', animation: 'fade', y: 0.45, fontSize: 0.11, font: 'Lobster', color: '#f472b6' },
  { label: 'Modern', text: 'Modern title', preset: 'classic', animation: 'slideup', y: 0.5, fontSize: 0.07, font: 'Montserrat' },
];

function TextTab() {
  // Preload fonts so template tiles render in their own typeface.
  useEffect(() => {
    FONTS.forEach((f) => void ensureFont(f));
  }, []);
  const add = (p: (typeof TEXT_PRESETS)[number]) => {
    const s = useEditor.getState();
    s.addText(p.text);
    const id = useEditor.getState().selectedId!;
    s.updateClip(
      id,
      {
        preset: p.preset,
        animation: p.animation,
        y: p.y,
        fontSize: p.fontSize,
        font: p.font,
        color: p.color ?? '#ffffff',
        highlight: p.highlight ?? '#ffd400',
      },
      false,
    );
  };
  return (
    <>
      <h3>{tr('Add text')}</h3>
      <div className="tile-grid">
        {TEXT_PRESETS.map((p) => (
          <button key={tr(p.label)} className="tile" onClick={() => add(p)} style={{ fontFamily: p.font ? `"${p.font}", Inter` : undefined }}>
            <b>{tr(p.label)}</b>
          </button>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        {tr('Text is added at the playhead. Drag it in the preview to move it.')}
      </p>
      <CustomFonts />
    </>
  );
}

function TransitionTab() {
  // The target cut depends on the selection, the clips and (without a selection) the playhead.
  useEditor((s) => s.project.clips);
  useEditor((s) => s.selectedId);
  useEditor((s) => (s.selectedId ? 0 : Math.round(s.time)));
  const cut = targetCut();
  const current = cut?.to.transition;

  if (!cut) {
    return (
      <>
        <h3>{tr('Transitions')}</h3>
        <div className="notice">
          {tr('A transition goes where two clips meet, so the main track needs at least two clips.')}
          <br />
          <br />
          {tr('Add a second video, or move the playhead into a video and press S to split it.')}
        </div>
        <CustomEffects kind="transition" disabled onApply={() => {}} />
      </>
    );
  }

  return (
    <>
      <h3>{tr('Transitions')}</h3>
      <div className="notice">
        <b>
          {tr('Cut')} {cut.index}
        </b>{' '}
        · {formatTime(cut.to.start)}
        <br />
        {tr('For another cut, click a ◆ marker or a clip on the timeline.')}
      </div>
      <div className="tile-grid" style={{ marginTop: 10 }}>
        <button className={`tile ${!current ? 'active' : ''}`} onClick={() => applyTransition(cut, null)}>
          {tr('None')}
        </button>
        {TRANSITION_TYPES.map((t) => (
          <button key={t.type} className={`tile ${current?.type === t.type && !current.effectId ? 'active' : ''}`} onClick={() => applyTransition(cut, t.type)}>
            {tr(t.label)}
          </button>
        ))}
        <LibraryEffects
          kind="transition"
          activeId={current?.effectId}
          disabled={false}
          onApply={(id) => applyTransition(cut, 'fade', undefined, resolveEffect(id, 'transition'))}
        />
      </div>
      {current && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>
            {tr('Duration')}{' '}
            <span>
              {current.duration.toFixed(1)} {tr('s')}
            </span>
          </label>
          <input
            type="range"
            min={0.2}
            max={maxTransitionDuration(cut)}
            step={0.1}
            value={current.duration}
            onPointerDown={() => useEditor.getState().checkpoint()}
            onChange={(e) => useEditor.getState().updateClip(cut.to.id, { transition: { ...current, duration: +e.target.value } } as Partial<MediaClip>, false)}
          />
          <button className="btn small" style={{ marginTop: 6 }} onClick={() => applyTransition(cut, current.type, undefined, current.effectId)}>
            {tr('▶ Preview transition')}
          </button>
        </div>
      )}
      <CustomEffects kind="transition" activeId={current?.effectId} disabled={false} onApply={(id) => applyTransition(cut, 'fade', undefined, id)} />
    </>
  );
}

function FilterTab() {
  const selected = useEditor(selectedClip);
  const luts = useEditor((s) => s.project.luts);
  const media = selected?.type === 'media' ? selected : null;
  const lutInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <h3>{tr('Filters')}</h3>
      {!media && <p className="hint">{tr('Select a video or image clip to apply a filter.')}</p>}
      <div className="tile-grid" style={{ marginTop: 10 }}>
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.name}
            className="tile"
            disabled={!media}
            onClick={() => media && useEditor.getState().updateClip(media.id, { filter: { ...p.filter } } as Partial<MediaClip>)}
          >
            <div className="swatch" style={{ background: p.swatch }} />
            {tr(p.name)}
          </button>
        ))}
      </div>
      <div className="section-title" style={{ marginTop: 18 }}>
        {tr('Effects')}
      </div>
      <div className="tile-grid" style={{ marginTop: 8 }}>
        <LibraryEffects kind="filter" activeId={media?.filter.effectId} disabled={!media} onApply={(id) => media && applyFilterEffect(media.id, id)} />
      </div>
      <div className="section-title" style={{ marginTop: 18 }}>
        {tr('LUTs (color tables)')}
      </div>
      <p className="hint">{tr('Load .cube files from Adobe, DaVinci Resolve and similar tools.')}</p>
      <div className="tile-grid" style={{ marginTop: 8 }}>
        {Object.values(luts).map((lut) => (
          <button
            key={lut.id}
            className={`tile ${media?.filter.lutId === lut.id ? 'active' : ''}`}
            disabled={!media}
            onClick={() => media && useEditor.getState().updateClip(media.id, { filter: { ...media.filter, lutId: lut.id } } as Partial<MediaClip>)}
          >
            {lut.name}
          </button>
        ))}
        <button className="tile" onClick={() => lutInput.current?.click()}>
          {tr('+ Load .cube')}
        </button>
      </div>
      <input ref={lutInput} type="file" accept=".cube" hidden onChange={(e) => e.target.files?.[0] && void importLut(e.target.files[0], media ?? undefined)} />
      <CustomEffects kind="filter" activeId={media?.filter.effectId} disabled={!media} onApply={(id) => media && applyFilterEffect(media.id, id)} />
    </>
  );
}
