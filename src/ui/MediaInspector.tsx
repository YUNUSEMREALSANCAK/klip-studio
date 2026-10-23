import { tr } from '../i18n';
import { useRef } from 'react';
import { useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type FilterSettings, type MaskSettings, type MediaClip, type TransitionType } from '../core/types';
import { TRANSITION_TYPES } from '../render/shaders';
import { KeySlider, Section, Slider, Toggle } from './controls';
import { freezeFrame, importLut, reverse, setSpeed } from './editActions';
import { Icon } from './icons';
import { applyTransition, maxTransitionDuration, targetCut } from './transitions';
import { useUi } from './uiStore';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];
const DEFAULT_MASK: MaskSettings = { shape: 'ellipse', x: 0.5, y: 0.5, width: 0.6, height: 0.6, feather: 0.1, invert: false };
const percent = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (v: number) => `${v.toFixed(1)} sn`;

export function MediaInspector({ clip }: { clip: MediaClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const luts = useEditor((s) => s.project.luts);
  useEditor((s) => s.project.clips); // kesimler değişince yeniden hesapla
  const lutInput = useRef<HTMLInputElement>(null);
  const cut = clip.track === 'main' ? targetCut() : null;
  const update = (patch: Partial<MediaClip>, record = false) => useEditor.getState().updateClip(clip.id, patch, record);
  const checkpoint = () => useEditor.getState().checkpoint();
  const setFilter = (patch: Partial<FilterSettings>) => update({ filter: { ...clip.filter, ...patch } });
  const setMask = (patch: Partial<MaskSettings>) => update({ mask: { ...(clip.mask ?? DEFAULT_MASK), ...patch } });
  const visual = asset.kind !== 'audio';
  const isVideo = asset.kind === 'video';

  return (
    <>
      <h3>{asset.name}</h3>
      <div className="sub">
        {clip.track === 'main' ? tr('Ana iz') : clip.track === 'overlay' ? tr('Üst katman') : tr('Ses izi')} · {formatTime(clip.duration)}
        {clip.speed !== 1 && ` · ${clip.speed}×`}
      </div>

      {asset.kind !== 'image' && (
        <Section title={tr('Hız')}>
          <div className="chips" style={{ marginBottom: 10 }}>
            {SPEEDS.map((v) => (
              <button key={v} className={`chip ${clip.speed === v ? 'active' : ''}`} onClick={() => setSpeed(clip, v)}>
                {v}×
              </button>
            ))}
          </div>
          {clip.speed < 1 && isVideo && (
            <Toggle label={tr('Akıcı yavaş çekim (dışa aktarmada)')} on={clip.smoothSlowMo} onChange={(smoothSlowMo) => update({ smoothSlowMo }, true)} />
          )}
          <Slider
            label={tr('Özel hız')}
            value={clip.speed}
            min={0.25}
            max={4}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onCommit={() => {}}
            onChange={(v) => setSpeed(clip, v)}
          />
          {isVideo && (
            <div className="row">
              <button
                className="btn small"
                disabled={clip.track !== 'main'}
                title={clip.track !== 'main' ? tr('Ana izdeki kliplerde çalışır') : ''}
                onClick={() => void freezeFrame(clip)}
              >
                {tr('Kareyi dondur')}
              </button>
              <button className="btn small" onClick={() => void reverse(clip)}>
                {tr('Ters çevir')}
              </button>
            </div>
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Konum ve boyut')}>
          <KeySlider clip={clip} prop="scale" label={tr('Boyut')} min={0.05} max={2} format={percent} />
          <KeySlider clip={clip} prop="x" label={tr('Yatay konum')} min={0} max={1} format={percent} />
          <KeySlider clip={clip} prop="y" label={tr('Dikey konum')} min={0} max={1} format={percent} />
          <KeySlider clip={clip} prop="rotation" label={tr('Döndürme')} min={-180} max={180} format={(v) => `${Math.round(v)}°`} />
          <KeySlider clip={clip} prop="opacity" label={tr('Opaklık')} min={0} max={1} format={percent} />
          <div className="row">
            <button className="btn small" onClick={() => update({ transform: { ...clip.transform, x: 0.5, y: 0.5 } }, true)}>
              {tr('Ortala')}
            </button>
            {clip.track === 'main' && (
              <button className="btn small" onClick={() => update({ transform: { ...DEFAULT_TRANSFORM } }, true)}>
                {tr('Tuvale sığdır')}
              </button>
            )}
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            {tr('◆ ile oynatma çizgisine anahtar kare ekleyin; iki kare arasında değer yumuşakça değişir.')}
          </div>
        </Section>
      )}

      {asset.hasAudio && (
        <Section title={tr('Ses')}>
          <KeySlider clip={clip} prop="volume" label={tr('Ses düzeyi')} min={0} max={2} format={percent} />
          <Toggle label={tr('Sesi kapat')} on={clip.muted} onChange={(muted) => update({ muted }, true)} />
          <Slider
            label={tr('Giriş (fade in)')}
            value={clip.fadeIn}
            min={0}
            max={Math.min(5, clip.duration / 2)}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(fadeIn) => update({ fadeIn })}
          />
          <Slider
            label={tr('Çıkış (fade out)')}
            value={clip.fadeOut}
            min={0}
            max={Math.min(5, clip.duration / 2)}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(fadeOut) => update({ fadeOut })}
          />
          <Toggle label={tr('Konuşmada müziği kıs')} on={clip.duck} onChange={(duck) => update({ duck }, true)} />
        </Section>
      )}

      {cut && (
        <Section title={`${tr('Geçiş')} · ${cut.index}. ${tr('kesim')}`}>
          <select
            value={cut.to.transition?.type ?? ''}
            onChange={(e) => applyTransition(cut, (e.target.value || null) as TransitionType | null)}
            style={{ width: '100%', marginBottom: 10 }}
          >
            <option value="">{tr('Geçiş yok')}</option>
            {TRANSITION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {tr(t.label)}
              </option>
            ))}
          </select>
          {cut.to.transition && (
            <Slider
              label={tr('Süre')}
              value={cut.to.transition.duration}
              min={0.2}
              max={maxTransitionDuration(cut)}
              onCommit={checkpoint}
              format={seconds}
              onChange={(duration) =>
                useEditor.getState().updateClip(cut.to.id, { transition: { ...cut.to.transition!, duration } } as Partial<MediaClip>, false)
              }
            />
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Renk ayarı')}>
          <Slider
            label={tr('Parlaklık')}
            value={clip.filter.brightness}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(brightness) => setFilter({ brightness })}
          />
          <Slider label={tr('Kontrast')} value={clip.filter.contrast} min={-1} max={1} onCommit={checkpoint} onChange={(contrast) => setFilter({ contrast })} />
          <Slider
            label={tr('Doygunluk')}
            value={clip.filter.saturation}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(saturation) => setFilter({ saturation })}
          />
          <Slider
            label={tr('Sıcaklık')}
            value={clip.filter.temperature}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(temperature) => setFilter({ temperature })}
          />
          <Slider label={tr('Keskinlik')} value={clip.filter.sharpen} min={0} max={1} onCommit={checkpoint} onChange={(sharpen) => setFilter({ sharpen })} />
          <Slider label={tr('Vinyet')} value={clip.filter.vignette} min={0} max={1} onCommit={checkpoint} onChange={(vignette) => setFilter({ vignette })} />
          <Toggle label={tr('Siyah-beyaz')} on={clip.filter.grayscale} onChange={(grayscale) => update({ filter: { ...clip.filter, grayscale } }, true)} />
          <div className="field">
            <label>{tr('LUT (renk tablosu)')}</label>
            <div className="row">
              <select value={clip.filter.lutId ?? ''} onChange={(e) => update({ filter: { ...clip.filter, lutId: e.target.value || undefined } }, true)}>
                <option value="">{tr('Yok')}</option>
                {Object.values(luts).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button className="btn small" style={{ flex: 'none' }} onClick={() => lutInput.current?.click()}>
                {tr('.cube yükle')}
              </button>
            </div>
            <input ref={lutInput} type="file" accept=".cube" hidden onChange={(e) => e.target.files?.[0] && void importLut(e.target.files[0], clip)} />
          </div>
          {clip.filter.lutId && (
            <Slider
              label={tr('LUT yoğunluğu')}
              value={clip.filter.lutIntensity}
              min={0}
              max={1}
              onCommit={checkpoint}
              format={percent}
              onChange={(lutIntensity) => setFilter({ lutIntensity })}
            />
          )}
          <button className="btn small" onClick={() => update({ filter: { ...DEFAULT_FILTER } }, true)}>
            {tr('Sıfırla')}
          </button>
        </Section>
      )}

      {visual && (
        <Section title={tr('Maske')} open={!!clip.mask}>
          <div className="chips" style={{ marginBottom: 10 }}>
            {(
              [
                ['', 'Yok'],
                ['rect', 'Dikdörtgen'],
                ['ellipse', 'Elips'],
                ['linear', 'Doğrusal'],
              ] as const
            ).map(([shape, label]) => (
              <button
                key={shape}
                className={`chip ${(clip.mask?.shape ?? '') === shape ? 'active' : ''}`}
                onClick={() => update({ mask: shape ? { ...(clip.mask ?? DEFAULT_MASK), shape } : undefined }, true)}
              >
                {tr(label)}
              </button>
            ))}
          </div>
          {clip.mask && (
            <>
              <Slider label={tr('Yatay merkez')} value={clip.mask.x} min={0} max={1} format={percent} onCommit={checkpoint} onChange={(x) => setMask({ x })} />
              <Slider label={tr('Dikey merkez')} value={clip.mask.y} min={0} max={1} format={percent} onCommit={checkpoint} onChange={(y) => setMask({ y })} />
              {clip.mask.shape !== 'linear' && (
                <>
                  <Slider
                    label={tr('Genişlik')}
                    value={clip.mask.width}
                    min={0.05}
                    max={1.5}
                    format={percent}
                    onCommit={checkpoint}
                    onChange={(width) => setMask({ width })}
                  />
                  <Slider
                    label={tr('Yükseklik')}
                    value={clip.mask.height}
                    min={0.05}
                    max={1.5}
                    format={percent}
                    onCommit={checkpoint}
                    onChange={(height) => setMask({ height })}
                  />
                </>
              )}
              <Slider
                label={tr('Yumuşaklık')}
                value={clip.mask.feather}
                min={0}
                max={0.5}
                format={percent}
                onCommit={checkpoint}
                onChange={(feather) => setMask({ feather })}
              />
              <Toggle label={tr('Ters çevir')} on={clip.mask.invert} onChange={(invert) => setMask({ invert })} />
            </>
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Yeşil perde (chroma key)')} open={!!clip.chroma}>
          <Toggle
            label={tr('Renk anahtarını aç')}
            on={!!clip.chroma}
            onChange={(on) => update({ chroma: on ? { color: '#00ff00', similarity: 0.4, smoothness: 0.2 } : undefined }, true)}
          />
          {clip.chroma && (
            <>
              <div className="toggle">
                <span>{tr('Silinecek renk')}</span>
                <input
                  type="color"
                  value={clip.chroma.color}
                  onFocus={checkpoint}
                  onChange={(e) => update({ chroma: { ...clip.chroma!, color: e.target.value } })}
                />
              </div>
              <Slider
                label={tr('Benzerlik')}
                value={clip.chroma.similarity}
                min={0}
                max={1}
                format={percent}
                onCommit={checkpoint}
                onChange={(similarity) => update({ chroma: { ...clip.chroma!, similarity } })}
              />
              <Slider
                label={tr('Kenar yumuşaklığı')}
                value={clip.chroma.smoothness}
                min={0}
                max={1}
                format={percent}
                onCommit={checkpoint}
                onChange={(smoothness) => update({ chroma: { ...clip.chroma!, smoothness } })}
              />
            </>
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Yapay zeka')}>
          <Toggle label={tr('Arka planı kaldır')} on={clip.removeBackground} onChange={(removeBackground) => update({ removeBackground }, true)} />
          {clip.reframe && <Toggle label={tr('Akıllı çerçeveleme')} on onChange={() => update({ reframe: undefined }, true)} />}
          <button className="btn block" onClick={() => useUi.getState().openObjectEditor(clip.id)}>
            <Icon name="wand" size={16} /> {tr('Nesne seç ve sil')}
          </button>
        </Section>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> {tr('Klibi sil')}
        </button>
      </div>
    </>
  );
}
