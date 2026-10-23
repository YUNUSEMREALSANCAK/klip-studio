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
      <Toggle
        label="Boşlukları bulanık doldur"
        on={blur}
        onChange={(backgroundBlur) => {
          useEditor.getState().checkpoint();
          useEditor.setState((s) => ({ project: { ...s.project, backgroundBlur } }));
        }}
      />
      <div className="hint">Dikey videoya yatay klip koyunca kenarlar videonun bulanık hâliyle dolar.</div>
      <AgentBridgeToggle />
      <div className="section-title" style={{ marginTop: 16 }}>Kısayollar</div>
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
        <div className="field">
          <label>Yazı tipi</label>
          <select value={familyOf(clip)} onChange={(e) => update({ font: e.target.value }, true)}>
            {FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </div>
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
        label="Ajan bağlantısı (MCP)"
        on={enabled}
        onChange={(on) => {
          setEnabled(on);
          setBridgeEnabled(on);
        }}
      />
      <div className="hint">
        Durum: <b className={`bridge-${status}`}>{BRIDGE_TEXT[status]}</b>. Sunucuyu <code>npm run mcp</code> ile başlatın; ayrıntılar README'de.
      </div>
    </>
  );
}
