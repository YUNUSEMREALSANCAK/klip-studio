import type { ReactNode } from 'react';
import { selectedClip, useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import { DEFAULT_FILTER, type FilterSettings, type MediaClip, type TextAnimation, type TextClip, type TextStylePreset, type TransitionType } from '../core/types';
import { TRANSITION_TYPES } from '../render/shaders';
import { Icon } from './icons';
import { applyTransition, maxTransitionDuration, targetCut } from './transitions';
import { useUi } from './uiStore';

function Slider({ label, value, min, max, step = 0.01, format, onChange, onCommit }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <div className="field">
      <label>
        {label} <span>{format ? format(value) : Math.round(value * 100)}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onCommit} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="toggle">
      <span>{label}</span>
      <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <>
    <div className="section-title">{title}</div>
    {children}
  </>
);

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
  return (
    <>
      <h3>Proje</h3>
      <div className="sub">Bir klip seçerek özelliklerini düzenleyin.</div>
      <div className="toggle">
        <span>Arka plan rengi</span>
        <input
          type="color"
          value={background}
          onChange={(e) => useEditor.setState((s) => ({ project: { ...s.project, background: e.target.value } }))}
        />
      </div>
      <div className="section-title">Kısayollar</div>
      <div className="hint">
        Boşluk — oynat / duraklat
        <br />S veya ⌘B — böl
        <br />Sil — klibi kaldır
        <br />⌘Z / ⇧⌘Z — geri al / yinele
        <br />← → — kare kare ilerle (⇧ ile 1 sn)
      </div>
    </>
  );
}

function MediaInspector({ clip }: { clip: MediaClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  useEditor((s) => s.project.clips); // kesimler değişince yeniden hesapla
  const cut = clip.track === 'main' ? targetCut() : null;
  const update = (patch: Partial<MediaClip>, record = false) => useEditor.getState().updateClip(clip.id, patch, record);
  const checkpoint = () => useEditor.getState().checkpoint();
  const setFilter = (patch: Partial<FilterSettings>) => update({ filter: { ...clip.filter, ...patch } });
  const visual = asset.kind !== 'audio';

  return (
    <>
      <h3>{asset.name}</h3>
      <div className="sub">
        {clip.track === 'main' ? 'Ana iz' : clip.track === 'overlay' ? 'Üst katman' : 'Ses izi'} · {formatTime(clip.duration)}
      </div>

      {asset.hasAudio && (
        <Section title="Ses">
          <Slider label="Ses düzeyi" value={clip.volume} min={0} max={1} onCommit={checkpoint} onChange={(volume) => update({ volume })} format={(v) => `${Math.round(v * 100)}%`} />
          <Toggle label="Sesi kapat" on={clip.muted} onChange={(muted) => update({ muted }, true)} />
        </Section>
      )}

      {visual && (
        <Section title="Konum ve boyut">
          <Slider label="Boyut" value={clip.transform.scale} min={0.05} max={2} onCommit={checkpoint} onChange={(scale) => update({ transform: { ...clip.transform, scale } })} />
          <Slider label="Yatay konum" value={clip.transform.x} min={0} max={1} onCommit={checkpoint} onChange={(x) => update({ transform: { ...clip.transform, x } })} />
          <Slider label="Dikey konum" value={clip.transform.y} min={0} max={1} onCommit={checkpoint} onChange={(y) => update({ transform: { ...clip.transform, y } })} />
          <div className="row">
            <button className="btn small" onClick={() => update({ transform: { ...clip.transform, x: 0.5, y: 0.5 } }, true)}>
              Ortala
            </button>
            {clip.track === 'main' && (
              <button className="btn small" onClick={() => update({ transform: { x: 0.5, y: 0.5, scale: 1 } }, true)}>
                Tuvale sığdır
              </button>
            )}
          </div>
          <div className="hint" style={{ marginTop: 8 }}>Önizlemede sürükleyerek taşıyın, köşelerden boyutlandırın.</div>
        </Section>
      )}

      {cut && (
        <Section title={`Geçiş · ${cut.index}. kesim`}>
          <select
            value={cut.to.transition?.type ?? ''}
            onChange={(e) => applyTransition(cut, (e.target.value || null) as TransitionType | null)}
            style={{ width: '100%', marginBottom: 10 }}
          >
            <option value="">Geçiş yok</option>
            {TRANSITION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          {cut.to.transition && (
            <Slider
              label="Süre"
              value={cut.to.transition.duration}
              min={0.2}
              max={maxTransitionDuration(cut)}
              onCommit={checkpoint}
              format={(v) => `${v.toFixed(1)} sn`}
              onChange={(duration) =>
                useEditor.getState().updateClip(cut.to.id, { transition: { ...cut.to.transition!, duration } } as Partial<MediaClip>, false)
              }
            />
          )}
        </Section>
      )}

      {visual && (
        <Section title="Renk ayarı">
          <Slider label="Parlaklık" value={clip.filter.brightness} min={-1} max={1} onCommit={checkpoint} onChange={(brightness) => setFilter({ brightness })} />
          <Slider label="Kontrast" value={clip.filter.contrast} min={-1} max={1} onCommit={checkpoint} onChange={(contrast) => setFilter({ contrast })} />
          <Slider label="Doygunluk" value={clip.filter.saturation} min={-1} max={1} onCommit={checkpoint} onChange={(saturation) => setFilter({ saturation })} />
          <Slider label="Sıcaklık" value={clip.filter.temperature} min={-1} max={1} onCommit={checkpoint} onChange={(temperature) => setFilter({ temperature })} />
          <Slider label="Keskinlik" value={clip.filter.sharpen} min={0} max={1} onCommit={checkpoint} onChange={(sharpen) => setFilter({ sharpen })} />
          <Slider label="Vinyet" value={clip.filter.vignette} min={0} max={1} onCommit={checkpoint} onChange={(vignette) => setFilter({ vignette })} />
          <Toggle label="Siyah-beyaz" on={clip.filter.grayscale} onChange={(grayscale) => update({ filter: { ...clip.filter, grayscale } }, true)} />
          <button className="btn small" onClick={() => update({ filter: { ...DEFAULT_FILTER } }, true)}>
            Sıfırla
          </button>
        </Section>
      )}

      {visual && (
        <Section title="Yapay zeka">
          <Toggle label="Arka planı kaldır" on={clip.removeBackground} onChange={(removeBackground) => update({ removeBackground }, true)} />
          {clip.reframe && <Toggle label="Akıllı çerçeveleme" on onChange={() => update({ reframe: undefined }, true)} />}
          <button className="btn block" onClick={() => useUi.getState().openObjectEditor(clip.id)}>
            <Icon name="wand" size={16} /> Nesne seç ve sil
          </button>
        </Section>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> Klibi sil
        </button>
      </div>
    </>
  );
}

const PRESETS: { id: TextStylePreset; label: string }[] = [
  { id: 'classic', label: 'Klasik' },
  { id: 'box', label: 'Kutulu' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'neon', label: 'Neon' },
  { id: 'title', label: 'Başlık' },
];

const ANIMATIONS: { id: TextAnimation; label: string }[] = [
  { id: 'none', label: 'Yok' },
  { id: 'fade', label: 'Belirme' },
  { id: 'pop', label: 'Zıplama' },
  { id: 'slideup', label: 'Yukarı kayma' },
  { id: 'typewriter', label: 'Daktilo' },
];

function TextInspector({ clip }: { clip: TextClip }) {
  const update = (patch: Partial<TextClip>, record = false) => useEditor.getState().updateClip(clip.id, patch, record);
  const checkpoint = () => useEditor.getState().checkpoint();
  return (
    <>
      <h3>Metin</h3>
      <div className="sub">{formatTime(clip.start)} · {formatTime(clip.duration)}</div>
      <div className="field">
        <textarea
          rows={3}
          value={clip.text}
          onFocus={checkpoint}
          // Elle düzenlenen altyazının kelime zamanları artık geçersizdir.
          onChange={(e) => update({ text: e.target.value, words: e.target.value.split(/\s+/).length === clip.words?.length ? clip.words : undefined })}
        />
      </div>
      <Section title="Stil">
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.id} className={`chip ${clip.preset === p.id ? 'active' : ''}`} onClick={() => update({ preset: p.id }, true)}>
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Animasyon">
        <div className="chips">
          {ANIMATIONS.map((a) => (
            <button key={a.id} className={`chip ${clip.animation === a.id ? 'active' : ''}`} onClick={() => update({ animation: a.id }, true)}>
              {a.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Görünüm">
        <div className="toggle">
          <span>Renk</span>
          <input type="color" value={clip.color} onFocus={checkpoint} onChange={(e) => update({ color: e.target.value })} />
        </div>
        <div className="toggle">
          <span>Vurgu rengi</span>
          <input type="color" value={clip.highlight} onFocus={checkpoint} onChange={(e) => update({ highlight: e.target.value })} />
        </div>
        <Slider label="Yazı boyutu" value={clip.fontSize} min={0.02} max={0.2} step={0.005} onCommit={checkpoint} onChange={(fontSize) => update({ fontSize })} />
        <Slider label="Dikey konum" value={clip.y} min={0.05} max={0.95} onCommit={checkpoint} onChange={(y) => update({ y })} />
      </Section>
      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> Metni sil
        </button>
      </div>
    </>
  );
}
