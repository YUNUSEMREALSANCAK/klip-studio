import { tr } from '../i18n';
import { selectedClip, useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import type { TextAnimation, TextClip, TextStylePreset } from '../core/types';
import { familyOf, FONTS } from '../render/fonts';
import { Section, Slider, Toggle } from './controls';
import { Icon } from './icons';
import { MediaInspector } from './MediaInspector';
import { bridgeEnabled, onBridgeStatus, setBridgeEnabled, type BridgeStatus } from '../agent/bridge';
import { useEffect, useState } from 'react';

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
      <h3>{tr('Proje')}</h3>
      <div className="sub">{tr('Bir klip seçerek özelliklerini düzenleyin.')}</div>
      <div className="toggle">
        <span>{tr('Arka plan rengi')}</span>
        <input type="color" value={background} onChange={(e) => useEditor.setState((s) => ({ project: { ...s.project, background: e.target.value } }))} />
      </div>
      <Toggle
        label={tr('Boşlukları bulanık doldur')}
        on={blur}
        onChange={(backgroundBlur) => {
          useEditor.getState().checkpoint();
          useEditor.setState((s) => ({ project: { ...s.project, backgroundBlur } }));
        }}
      />
      <div className="hint">{tr('Dikey videoya yatay klip koyunca kenarlar videonun bulanık hâliyle dolar.')}</div>
      <AgentBridgeToggle />
      <div className="section-title" style={{ marginTop: 16 }}>
        {tr('Kısayollar')}
      </div>
      <div className="hint">
        {tr('Boşluk — oynat / duraklat')}
        <br />
        {tr('S veya ⌘B — böl')}
        <br />
        {tr('Sil — klibi kaldır')}
        <br />
        {tr('⌘Z / ⇧⌘Z — geri al / yinele')}
        <br />
        {tr('← → — kare kare ilerle (⇧ ile 1 sn)')}
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
      <h3>{tr('Metin')}</h3>
      <div className="sub">
        {formatTime(clip.start)} · {formatTime(clip.duration)}
      </div>
      <div className="field">
        <textarea
          rows={3}
          value={clip.text}
          onFocus={checkpoint}
          // Elle düzenlenen altyazının kelime zamanları artık geçersizdir.
          onChange={(e) => update({ text: e.target.value, words: e.target.value.split(/\s+/).length === clip.words?.length ? clip.words : undefined })}
        />
      </div>
      <Section title={tr('Stil')}>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.id} className={`chip ${clip.preset === p.id ? 'active' : ''}`} onClick={() => update({ preset: p.id }, true)}>
              {tr(p.label)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={tr('Animasyon')}>
        <div className="chips">
          {ANIMATIONS.map((a) => (
            <button key={a.id} className={`chip ${clip.animation === a.id ? 'active' : ''}`} onClick={() => update({ animation: a.id }, true)}>
              {tr(a.label)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={tr('Görünüm')}>
        <div className="field">
          <label>{tr('Yazı tipi')}</label>
          <select value={familyOf(clip)} onChange={(e) => update({ font: e.target.value }, true)}>
            {FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="toggle">
          <span>{tr('Renk')}</span>
          <input type="color" value={clip.color} onFocus={checkpoint} onChange={(e) => update({ color: e.target.value })} />
        </div>
        <div className="toggle">
          <span>{tr('Vurgu rengi')}</span>
          <input type="color" value={clip.highlight} onFocus={checkpoint} onChange={(e) => update({ highlight: e.target.value })} />
        </div>
        <Slider
          label={tr('Yazı boyutu')}
          value={clip.fontSize}
          min={0.02}
          max={0.2}
          step={0.005}
          onCommit={checkpoint}
          onChange={(fontSize) => update({ fontSize })}
        />
        <Slider label={tr('Dikey konum')} value={clip.y} min={0.05} max={0.95} onCommit={checkpoint} onChange={(y) => update({ y })} />
      </Section>
      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> {tr('Metni sil')}
        </button>
      </div>
    </>
  );
}

const BRIDGE_TEXT: Record<BridgeStatus, string> = { off: 'Kapalı', connecting: 'MCP sunucusu bekleniyor…', connected: 'Bağlı' };

// Claude gibi ajanların MCP sunucusu üzerinden editörü sürmesine izin verir.
function AgentBridgeToggle() {
  const [enabled, setEnabled] = useState(bridgeEnabled);
  const [status, setStatus] = useState<BridgeStatus>(enabled ? 'connecting' : 'off');
  useEffect(() => {
    onBridgeStatus(setStatus);
  }, []);
  return (
    <>
      <Toggle
        label={tr('Ajan bağlantısı (MCP)')}
        on={enabled}
        onChange={(on) => {
          setEnabled(on);
          setBridgeEnabled(on);
        }}
      />
      <div className="hint">
        {tr('Durum:')} <b className={`bridge-${status}`}>{tr(BRIDGE_TEXT[status])}</b>
        {tr('. Sunucuyu')} <code>{tr('npm run mcp')}</code> {tr("ile başlatın; ayrıntılar README'de.")}
      </div>
    </>
  );
}
