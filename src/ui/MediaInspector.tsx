import { tr } from '../i18n';
import { useRef } from 'react';
import { useEditor } from '../core/store';
import { SPEED_CURVES } from '../core/speed';
import { formatTime } from '../core/timeline';
import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type FilterSettings, type MaskSettings, type MediaClip, type TransitionType } from '../core/types';
import { TRANSITION_TYPES } from '../render/shaders';
import { KeySlider, Section, Slider, Toggle } from './controls';
import { freezeFrame, importLut, reverse, setSpeed, setSpeedCurve } from './editActions';
import { Icon } from './icons';
import { applyTransition, maxTransitionDuration, targetCut } from './transitions';
import { useUi } from './uiStore';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];
const DEFAULT_MASK: MaskSettings = { shape: 'ellipse', x: 0.5, y: 0.5, width: 0.6, height: 0.6, feather: 0.1, invert: false };
const percent = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (v: number) => `${v.toFixed(1)} s`;

export function MediaInspector({ clip }: { clip: MediaClip }) {
  const asset = useEditor((s) => s.assets[clip.assetId]);
  const luts = useEditor((s) => s.project.luts);
  const effectMap = useEditor((s) => s.project.effects);
  const effects = Object.values(effectMap);
  useEditor((s) => s.project.clips); // recompute when cuts change
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
        {clip.track === 'main' ? tr('Main track') : clip.track === 'overlay' ? tr('Overlay') : tr('Audio track')} · {formatTime(clip.duration)}
        {clip.speed !== 1 && ` · ${Number(clip.speed.toFixed(2))}×`}
      </div>

      {asset.kind !== 'image' && (
        <Section title={tr('Speed')}>
          <div className="chips" style={{ marginBottom: 10 }}>
            {SPEEDS.map((v) => (
              <button key={v} className={`chip ${clip.speed === v ? 'active' : ''}`} onClick={() => setSpeed(clip, v)}>
                {v}×
              </button>
            ))}
          </div>
          <div className="field-label" style={{ marginBottom: 6 }}>
            {tr('Speed curve')}
          </div>
          <div className="chips" style={{ marginBottom: 10 }}>
            <button className={`chip ${!clip.speedCurve ? 'active' : ''}`} onClick={() => setSpeedCurve(clip, null)}>
              {tr('None')}
            </button>
            {SPEED_CURVES.map((curve) => (
              <button key={curve.name} className={`chip ${clip.speedCurve?.name === curve.name ? 'active' : ''}`} onClick={() => setSpeedCurve(clip, curve)}>
                {tr(curve.name)}
              </button>
            ))}
          </div>
          {clip.speed < 1 && isVideo && (
            <>
              <div className="field-label" style={{ marginBottom: 6 }}>
                {tr('Smooth slow motion (on export)')}
              </div>
              <div className="chips" style={{ marginBottom: 10 }}>
                {(
                  [
                    [undefined, 'Off'],
                    ['blend', 'Frame blending'],
                    ['ai', 'AI (RIFE)'],
                  ] as const
                ).map(([mode, label]) => (
                  <button key={label} className={`chip ${clip.slowMotion === mode ? 'active' : ''}`} onClick={() => update({ slowMotion: mode }, true)}>
                    {tr(label)}
                  </button>
                ))}
              </div>
            </>
          )}
          <Slider
            label={tr('Custom speed')}
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
                title={clip.track !== 'main' ? tr('Works on main-track clips') : ''}
                onClick={() => void freezeFrame(clip)}
              >
                {tr('Freeze frame')}
              </button>
              <button className="btn small" onClick={() => void reverse(clip)}>
                {tr('Reverse')}
              </button>
            </div>
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Position & size')}>
          <KeySlider clip={clip} prop="scale" label={tr('Size')} min={0.05} max={2} format={percent} />
          <KeySlider clip={clip} prop="x" label={tr('Horizontal position')} min={0} max={1} format={percent} />
          <KeySlider clip={clip} prop="y" label={tr('Vertical position')} min={0} max={1} format={percent} />
          <KeySlider clip={clip} prop="rotation" label={tr('Rotation')} min={-180} max={180} format={(v) => `${Math.round(v)}°`} />
          <KeySlider clip={clip} prop="opacity" label={tr('Opacity')} min={0} max={1} format={percent} />
          <div className="row">
            <button className="btn small" onClick={() => update({ transform: { ...clip.transform, x: 0.5, y: 0.5 } }, true)}>
              {tr('Center')}
            </button>
            {clip.track === 'main' && (
              <button className="btn small" onClick={() => update({ transform: { ...DEFAULT_TRANSFORM } }, true)}>
                {tr('Fit to canvas')}
              </button>
            )}
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            {tr('Add a keyframe at the playhead with ◆; values ease smoothly between keyframes.')}
          </div>
        </Section>
      )}

      {asset.hasAudio && (
        <Section title={tr('Audio')}>
          <KeySlider clip={clip} prop="volume" label={tr('Volume')} min={0} max={2} format={percent} />
          <Toggle label={tr('Mute')} on={clip.muted} onChange={(muted) => update({ muted }, true)} />
          <Slider
            label={tr('Fade in')}
            value={clip.fadeIn}
            min={0}
            max={Math.min(5, clip.duration / 2)}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(fadeIn) => update({ fadeIn })}
          />
          <Slider
            label={tr('Fade out')}
            value={clip.fadeOut}
            min={0}
            max={Math.min(5, clip.duration / 2)}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(fadeOut) => update({ fadeOut })}
          />
          <Toggle label={tr('Duck music under speech')} on={clip.duck} onChange={(duck) => update({ duck }, true)} />
        </Section>
      )}

      {cut && (
        <Section title={`${tr('Transition')} · ${tr('Cut')} ${cut.index}`}>
          <select
            value={cut.to.transition ? (cut.to.transition.effectId ?? cut.to.transition.type) : ''}
            onChange={(e) => {
              const value = e.target.value;
              if (effects.some((fx) => fx.id === value)) applyTransition(cut, 'fade', undefined, value);
              else applyTransition(cut, (value || null) as TransitionType | null);
            }}
            style={{ width: '100%', marginBottom: 10 }}
          >
            <option value="">{tr('No transition')}</option>
            {TRANSITION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {tr(t.label)}
              </option>
            ))}
            {effects
              .filter((fx) => fx.kind === 'transition')
              .map((fx) => (
                <option key={fx.id} value={fx.id}>
                  {fx.name}
                </option>
              ))}
          </select>
          {cut.to.transition && (
            <Slider
              label={tr('Duration')}
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
        <Section title={tr('Color')}>
          <Slider
            label={tr('Brightness')}
            value={clip.filter.brightness}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(brightness) => setFilter({ brightness })}
          />
          <Slider label={tr('Contrast')} value={clip.filter.contrast} min={-1} max={1} onCommit={checkpoint} onChange={(contrast) => setFilter({ contrast })} />
          <Slider
            label={tr('Saturation')}
            value={clip.filter.saturation}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(saturation) => setFilter({ saturation })}
          />
          <Slider
            label={tr('Temperature')}
            value={clip.filter.temperature}
            min={-1}
            max={1}
            onCommit={checkpoint}
            onChange={(temperature) => setFilter({ temperature })}
          />
          <Slider label={tr('Sharpness')} value={clip.filter.sharpen} min={0} max={1} onCommit={checkpoint} onChange={(sharpen) => setFilter({ sharpen })} />
          <Slider label={tr('Vignette')} value={clip.filter.vignette} min={0} max={1} onCommit={checkpoint} onChange={(vignette) => setFilter({ vignette })} />
          <Toggle label={tr('Black & white')} on={clip.filter.grayscale} onChange={(grayscale) => update({ filter: { ...clip.filter, grayscale } }, true)} />
          <div className="field">
            <label>{tr('LUT (color table)')}</label>
            <div className="row">
              <select value={clip.filter.lutId ?? ''} onChange={(e) => update({ filter: { ...clip.filter, lutId: e.target.value || undefined } }, true)}>
                <option value="">{tr('None')}</option>
                {Object.values(luts).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button className="btn small" style={{ flex: 'none' }} onClick={() => lutInput.current?.click()}>
                {tr('Load .cube')}
              </button>
            </div>
            <input ref={lutInput} type="file" accept=".cube" hidden onChange={(e) => e.target.files?.[0] && void importLut(e.target.files[0], clip)} />
          </div>
          {effects.some((fx) => fx.kind === 'filter') && (
            <div className="field">
              <label>{tr('Custom filter')}</label>
              <select value={clip.filter.effectId ?? ''} onChange={(e) => update({ filter: { ...clip.filter, effectId: e.target.value || undefined } }, true)}>
                <option value="">{tr('None')}</option>
                {effects
                  .filter((fx) => fx.kind === 'filter')
                  .map((fx) => (
                    <option key={fx.id} value={fx.id}>
                      {fx.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {clip.filter.effectId && (
            <Slider
              label={tr('Filter amount')}
              value={clip.filter.effectAmount}
              min={0}
              max={1}
              onCommit={checkpoint}
              format={percent}
              onChange={(effectAmount) => setFilter({ effectAmount })}
            />
          )}
          {clip.filter.lutId && (
            <Slider
              label={tr('LUT intensity')}
              value={clip.filter.lutIntensity}
              min={0}
              max={1}
              onCommit={checkpoint}
              format={percent}
              onChange={(lutIntensity) => setFilter({ lutIntensity })}
            />
          )}
          <button className="btn small" onClick={() => update({ filter: { ...DEFAULT_FILTER } }, true)}>
            {tr('Reset')}
          </button>
        </Section>
      )}

      {visual && (
        <Section title={tr('Mask')} open={!!clip.mask}>
          <div className="chips" style={{ marginBottom: 10 }}>
            {(
              [
                ['', 'None'],
                ['rect', 'Rectangle'],
                ['ellipse', 'Ellipse'],
                ['linear', 'Linear'],
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
              <Slider
                label={tr('Horizontal center')}
                value={clip.mask.x}
                min={0}
                max={1}
                format={percent}
                onCommit={checkpoint}
                onChange={(x) => setMask({ x })}
              />
              <Slider
                label={tr('Vertical center')}
                value={clip.mask.y}
                min={0}
                max={1}
                format={percent}
                onCommit={checkpoint}
                onChange={(y) => setMask({ y })}
              />
              {clip.mask.shape !== 'linear' && (
                <>
                  <Slider
                    label={tr('Width')}
                    value={clip.mask.width}
                    min={0.05}
                    max={1.5}
                    format={percent}
                    onCommit={checkpoint}
                    onChange={(width) => setMask({ width })}
                  />
                  <Slider
                    label={tr('Height')}
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
                label={tr('Feather')}
                value={clip.mask.feather}
                min={0}
                max={0.5}
                format={percent}
                onCommit={checkpoint}
                onChange={(feather) => setMask({ feather })}
              />
              <Toggle label={tr('Reverse')} on={clip.mask.invert} onChange={(invert) => setMask({ invert })} />
            </>
          )}
        </Section>
      )}

      {visual && (
        <Section title={tr('Green screen (chroma key)')} open={!!clip.chroma}>
          <Toggle
            label={tr('Enable color key')}
            on={!!clip.chroma}
            onChange={(on) => update({ chroma: on ? { color: '#00ff00', similarity: 0.4, smoothness: 0.2 } : undefined }, true)}
          />
          {clip.chroma && (
            <>
              <div className="toggle">
                <span>{tr('Key color')}</span>
                <input
                  type="color"
                  value={clip.chroma.color}
                  onFocus={checkpoint}
                  onChange={(e) => update({ chroma: { ...clip.chroma!, color: e.target.value } })}
                />
              </div>
              <Slider
                label={tr('Similarity')}
                value={clip.chroma.similarity}
                min={0}
                max={1}
                format={percent}
                onCommit={checkpoint}
                onChange={(similarity) => update({ chroma: { ...clip.chroma!, similarity } })}
              />
              <Slider
                label={tr('Edge softness')}
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
        <Section title={tr('AI')}>
          <Toggle label={tr('Remove background')} on={clip.removeBackground} onChange={(removeBackground) => update({ removeBackground }, true)} />
          {clip.reframe && <Toggle label={tr('Smart reframe')} on onChange={() => update({ reframe: undefined }, true)} />}
          <button className="btn block" onClick={() => useUi.getState().openObjectEditor(clip.id)}>
            <Icon name="wand" size={16} /> {tr('Select & remove object')}
          </button>
        </Section>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn block" onClick={() => useEditor.getState().removeClip(clip.id)}>
          <Icon name="trash" size={16} /> {tr('Delete clip')}
        </button>
      </div>
    </>
  );
}
