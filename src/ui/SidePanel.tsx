import { useRef, useState } from 'react';
import { selectedClip, useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import type { MediaClip, TextAnimation, TextStylePreset } from '../core/types';
import { importFile, thumbnailOf } from '../media/importMedia';
import { FILTER_PRESETS } from '../render/filterPresets';
import { TRANSITION_TYPES } from '../render/shaders';
import { AiPanel } from './AiPanel';
import { Icon } from './icons';
import { applyTransition, maxTransitionDuration, targetCut } from './transitions';

type Tab = 'media' | 'text' | 'transition' | 'filter' | 'ai';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'media', label: 'Medya', icon: 'media' },
  { id: 'text', label: 'Metin', icon: 'text' },
  { id: 'transition', label: 'Geçiş', icon: 'transition' },
  { id: 'filter', label: 'Filtre', icon: 'filter' },
  { id: 'ai', label: 'Yapay Zeka', icon: 'ai' },
];

export function SidePanel() {
  const [tab, setTab] = useState<Tab>('media');
  return (
    <aside className="side">
      <nav className="side-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`side-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="side-body">
        {tab === 'media' && <MediaTab />}
        {tab === 'text' && <TextTab />}
        {tab === 'transition' && <TransitionTab />}
        {tab === 'filter' && <FilterTab />}
        {tab === 'ai' && <AiPanel />}
      </div>
    </aside>
  );
}

function MediaTab() {
  const assets = useEditor((s) => s.assets);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const addFiles = async (files: FileList | null) => {
    const s = useEditor.getState();
    for (const file of Array.from(files ?? [])) {
      const task = s.startTask(`İçe aktarılıyor: ${file.name}`);
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
        <div style={{ marginTop: 6 }}>Dosyaları sürükleyin veya tıklayın</div>
        <div className="hint">Video, ses, görsel</div>
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
            title="Çift tıklayın veya zaman çizelgesine sürükleyin"
          >
            <div className="asset-thumb" style={{ backgroundImage: thumbnailOf(asset) ? `url(${thumbnailOf(asset)})` : undefined }}>
              {!thumbnailOf(asset) && <Icon name="volume" size={26} />}
            </div>
            <span className="asset-badge">{asset.kind === 'video' ? 'Video' : asset.kind === 'audio' ? 'Ses' : 'Görsel'}</span>
            <div className="asset-actions">
              <button className="btn icon" title="Ana ize ekle" onClick={() => useEditor.getState().addAssetToTimeline(asset.id)}>
                <Icon name="plus" size={14} />
              </button>
              {asset.kind !== 'audio' && (
                <button className="btn icon" title="Üst katmana ekle (resim içinde resim)" onClick={() => useEditor.getState().addAssetToTimeline(asset.id, 'overlay')}>
                  ⧉
                </button>
              )}
            </div>
            <div className="asset-name">{asset.name}</div>
          </div>
        ))}
      </div>
    </>
  );
}

const TEXT_PRESETS: { label: string; text: string; preset: TextStylePreset; animation: TextAnimation; y: number; fontSize: number }[] = [
  { label: 'Başlık', text: 'BAŞLIK', preset: 'title', animation: 'pop', y: 0.45, fontSize: 0.12 },
  { label: 'Alt yazı', text: 'Alt yazı metni', preset: 'classic', animation: 'fade', y: 0.82, fontSize: 0.055 },
  { label: 'Kutulu', text: 'Kutulu metin', preset: 'box', animation: 'slideup', y: 0.8, fontSize: 0.05 },
  { label: 'Neon', text: 'NEON', preset: 'neon', animation: 'pop', y: 0.5, fontSize: 0.09 },
  { label: 'Daktilo', text: 'Harf harf yazılan metin', preset: 'classic', animation: 'typewriter', y: 0.5, fontSize: 0.06 },
  { label: 'Karaoke', text: 'Kelime kelime vurgulu', preset: 'karaoke', animation: 'none', y: 0.8, fontSize: 0.06 },
];

function TextTab() {
  const add = (p: (typeof TEXT_PRESETS)[number]) => {
    const s = useEditor.getState();
    s.addText(p.text);
    const id = useEditor.getState().selectedId!;
    s.updateClip(id, { preset: p.preset, animation: p.animation, y: p.y, fontSize: p.fontSize, color: p.preset === 'neon' ? '#22d3ee' : '#ffffff' }, false);
  };
  return (
    <>
      <h3>Metin ekle</h3>
      <div className="tile-grid">
        {TEXT_PRESETS.map((p) => (
          <button key={p.label} className="tile" onClick={() => add(p)}>
            <b>{p.label}</b>
          </button>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Metin oynatma çizgisinin olduğu yere eklenir. Konumunu önizlemede sürükleyerek değiştirebilirsiniz.
      </p>
    </>
  );
}

function TransitionTab() {
  // Hedef kesim seçime, kliplere ve (seçim yoksa) oynatma çizgisine bağlıdır.
  useEditor((s) => s.project.clips);
  useEditor((s) => s.selectedId);
  useEditor((s) => (s.selectedId ? 0 : Math.round(s.time)));
  const cut = targetCut();
  const current = cut?.to.transition;

  if (!cut) {
    return (
      <>
        <h3>Geçişler</h3>
        <div className="notice">
          Geçiş iki klibin birleştiği yere eklenir. Ana izde en az <b>iki klip</b> olmalı.
          <br />
          <br />
          İkinci bir video ekleyin ya da oynatma çizgisini videonun ortasına getirip <b>S</b> tuşuyla bölün.
        </div>
      </>
    );
  }

  return (
    <>
      <h3>Geçişler</h3>
      <div className="notice">
        Hedef: <b>{cut.index}. kesim</b> ({formatTime(cut.to.start)}) — {cut.from.duration.toFixed(1)} sn'lik klipten sonraki klibe.
        <br />
        Başka bir kesim için zaman çizelgesindeki ◆ işaretine veya bir klibe tıklayın.
      </div>
      <div className="tile-grid" style={{ marginTop: 10 }}>
        <button className={`tile ${!current ? 'active' : ''}`} onClick={() => applyTransition(cut, null)}>
          Yok
        </button>
        {TRANSITION_TYPES.map((t) => (
          <button key={t.type} className={`tile ${current?.type === t.type ? 'active' : ''}`} onClick={() => applyTransition(cut, t.type)}>
            {t.label}
          </button>
        ))}
      </div>
      {current && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>
            Süre <span>{current.duration.toFixed(1)} sn</span>
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
          <button className="btn small" style={{ marginTop: 6 }} onClick={() => applyTransition(cut, current.type)}>
            ▶ Geçişi önizle
          </button>
        </div>
      )}
    </>
  );
}

function FilterTab() {
  const selected = useEditor(selectedClip);
  const media = selected?.type === 'media' ? selected : null;
  return (
    <>
      <h3>Filtreler</h3>
      {!media && <p className="hint">Filtre uygulamak için bir video veya görsel klibi seçin.</p>}
      <div className="tile-grid" style={{ marginTop: 10 }}>
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.name}
            className="tile"
            disabled={!media}
            onClick={() => media && useEditor.getState().updateClip(media.id, { filter: { ...p.filter } } as Partial<MediaClip>)}
          >
            <div className="swatch" style={{ background: p.swatch }} />
            {p.name}
          </button>
        ))}
      </div>
    </>
  );
}
