import { useState } from 'react';
import { useEditor } from '../core/store';
import type { ClipMotion, CustomEffect, Easing, EffectParams, MediaClip, MotionType, TextAnimation, TextClip, TransitionType } from '../core/types';
import { tr } from '../i18n';
import { isLibraryId } from '../render/effectLibrary';
import { paramValues } from '../render/effects';
import { TRANSITION_TYPES } from '../render/shaders';
import { effectOptions, percent, seconds } from './clipOptions';
import { Slider } from './controls';
import { applyFilterEffect, resolveEffect } from './customActions';
import { EffectEditor } from './EffectEditor';
import { applyTransition, maxTransitionDuration, type Cut } from './transitions';

// Full settings for transitions, effects and animations; used by both the inspector and the applied effects panel.

const editor = () => useEditor.getState();
const checkpoint = () => editor().checkpoint();

const EASING_LABELS: [Easing, string][] = [
  ['linear', 'Linear'],
  ['easeIn', 'Ease in'],
  ['easeOut', 'Ease out'],
  ['easeInOut', 'Ease in-out'],
];

export const MOTIONS: [MotionType, string][] = [
  ['fade', 'Fade'],
  ['zoom', 'Zoom'],
  ['slideleft', 'Slide left'],
  ['slideright', 'Slide right'],
  ['slideup', 'Slide up'],
  ['slidedown', 'Slide down'],
  ['spin', 'Spin'],
];

export const TEXT_ANIMATIONS: [TextAnimation, string][] = [
  ['none', 'None'],
  ['fade', 'Fade'],
  ['pop', 'Pop'],
  ['slideup', 'Slide'],
  ['typewriter', 'Typewriter'],
];

const paramLabel = (name: string) => {
  const words = name.replace(/_+$/, '').replace(/_/g, ' ');
  return tr(words.charAt(0).toUpperCase() + words.slice(1));
};
const toHex = (rgb: number[]) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(Math.max(v, 0), 1) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
const fromHex = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// One control per parameter declared in the effect's code.
function ParamControls({
  code,
  values,
  onChange,
}: {
  code: string;
  values?: EffectParams;
  onChange: (values: EffectParams | undefined, record?: boolean) => void;
}) {
  const params = paramValues(code, values);
  if (!params.length) return null;
  const set = (name: string, value: number | number[], record = false) => onChange({ ...values, [name]: value }, record);
  return (
    <>
      {params.map((p) =>
        p.type === 'color' ? (
          <div key={p.name} className="toggle">
            <span>{paramLabel(p.name)}</span>
            <input type="color" value={toHex(p.value as number[])} onFocus={checkpoint} onChange={(e) => set(p.name, fromHex(e.target.value))} />
          </div>
        ) : (
          <Slider
            key={p.name}
            label={paramLabel(p.name)}
            value={p.value as number}
            min={p.min}
            max={p.max}
            step={(p.max - p.min) / 100}
            format={(v) => String(Number(v.toFixed(2)))}
            onCommit={checkpoint}
            onChange={(v) => set(p.name, v)}
          />
        ),
      )}
      {values && Object.keys(values).length > 0 && (
        <button className="btn small" onClick={() => onChange(undefined, true)}>
          {tr('Reset parameters')}
        </button>
      )}
    </>
  );
}

function EditCodeButton({ effect }: { effect?: CustomEffect }) {
  const [editing, setEditing] = useState(false);
  if (!effect || isLibraryId(effect.id)) return null;
  return (
    <>
      <button className="btn small" style={{ flex: 'none' }} onClick={() => setEditing(true)}>
        {tr('Edit code')}
      </button>
      {editing && <EffectEditor kind={effect.kind} effect={effect} onClose={() => setEditing(false)} />}
    </>
  );
}

export function TransitionSettings({ cut, allowNone = false }: { cut: Cut; allowNone?: boolean }) {
  const effects = useEditor((s) => s.project.effects);
  const transition = cut.to.transition;
  const options = effectOptions(effects, 'transition');
  const update = (patch: Partial<NonNullable<MediaClip['transition']>>, record = false) =>
    transition && editor().updateClip(cut.to.id, { transition: { ...transition, ...patch } } as Partial<MediaClip>, record);
  const effect = transition?.effectId ? effects[transition.effectId] : undefined;

  return (
    <>
      <div className="row">
        <select
          value={transition ? (transition.effectId ?? transition.type) : ''}
          aria-label={tr('Transition')}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) applyTransition(cut, null);
            else if (options.some((o) => o.id === value)) applyTransition(cut, 'fade', undefined, resolveEffect(value, 'transition'));
            else applyTransition(cut, value as TransitionType);
          }}
        >
          {allowNone && <option value="">{tr('No transition')}</option>}
          {TRANSITION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {tr(t.label)}
            </option>
          ))}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <EditCodeButton effect={effect} />
      </div>
      {transition && (
        <>
          <Slider
            label={tr('Duration')}
            value={transition.duration}
            min={0.2}
            max={maxTransitionDuration(cut)}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(duration) => update({ duration })}
          />
          <div className="field-label">{tr('Easing')}</div>
          <div className="chips">
            {EASING_LABELS.map(([id, label]) => (
              <button key={id} className={`chip ${(transition.easing ?? 'linear') === id ? 'active' : ''}`} onClick={() => update({ easing: id }, true)}>
                {tr(label)}
              </button>
            ))}
          </div>
          {effect && <ParamControls code={effect.code} values={transition.params} onChange={(params, record) => update({ params }, record)} />}
          <button className="btn small" onClick={() => applyTransition(cut, transition.type, undefined, transition.effectId)}>
            {tr('▶ Preview transition')}
          </button>
        </>
      )}
    </>
  );
}

export function EffectSettings({ clip, allowNone = false }: { clip: MediaClip; allowNone?: boolean }) {
  const effects = useEditor((s) => s.project.effects);
  const { filter } = clip;
  const effect = filter.effectId ? effects[filter.effectId] : undefined;
  const setFilter = (patch: Partial<MediaClip['filter']>, record = false) => editor().updateClip(clip.id, { filter: { ...clip.filter, ...patch } }, record);
  const fadeMax = Math.max(0.1, Math.min(5, clip.duration / 2));

  return (
    <>
      <div className="row">
        <select value={filter.effectId ?? ''} aria-label={tr('Effect')} onChange={(e) => applyFilterEffect(clip.id, e.target.value || null)}>
          {(allowNone || !filter.effectId) && <option value="">{tr('None')}</option>}
          {effectOptions(effects, 'filter').map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <EditCodeButton effect={effect} />
      </div>
      {effect && (
        <>
          <Slider
            label={tr('Intensity')}
            value={filter.effectAmount}
            min={0}
            max={1}
            format={percent}
            onCommit={checkpoint}
            onChange={(effectAmount) => setFilter({ effectAmount })}
          />
          <Slider
            label={tr('Fade in')}
            value={filter.effectFadeIn ?? 0}
            min={0}
            max={fadeMax}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(effectFadeIn) => setFilter({ effectFadeIn })}
          />
          <Slider
            label={tr('Fade out')}
            value={filter.effectFadeOut ?? 0}
            min={0}
            max={fadeMax}
            step={0.1}
            format={seconds}
            onCommit={checkpoint}
            onChange={(effectFadeOut) => setFilter({ effectFadeOut })}
          />
          <ParamControls code={effect.code} values={filter.effectParams} onChange={(effectParams, record) => setFilter({ effectParams }, record)} />
        </>
      )}
    </>
  );
}

function MotionRow({
  label,
  motion,
  max,
  onChange,
}: {
  label: string;
  motion?: ClipMotion;
  max: number;
  onChange: (motion: ClipMotion | undefined, record?: boolean) => void;
}) {
  return (
    <>
      <div className="field">
        <label>{label}</label>
        <select
          value={motion?.type ?? ''}
          onChange={(e) => onChange(e.target.value ? { type: e.target.value as MotionType, duration: motion?.duration ?? 0.5 } : undefined, true)}
        >
          <option value="">{tr('None')}</option>
          {MOTIONS.map(([id, name]) => (
            <option key={id} value={id}>
              {tr(name)}
            </option>
          ))}
        </select>
      </div>
      {motion && (
        <Slider
          label={tr('Duration')}
          value={motion.duration}
          min={0.1}
          max={max}
          step={0.1}
          format={seconds}
          onCommit={checkpoint}
          onChange={(duration) => onChange({ ...motion, duration })}
        />
      )}
    </>
  );
}

// In and out animations of a video or image clip.
export function MotionSettings({ clip }: { clip: MediaClip }) {
  const max = Math.max(0.2, Math.min(3, clip.duration / 2));
  const update = (patch: Partial<MediaClip>, record = false) => editor().updateClip(clip.id, patch, record);
  return (
    <>
      <MotionRow label={tr('In')} motion={clip.animIn} max={max} onChange={(animIn, record) => update({ animIn }, record)} />
      <MotionRow label={tr('Out')} motion={clip.animOut} max={max} onChange={(animOut, record) => update({ animOut }, record)} />
    </>
  );
}

export function TextAnimationSettings({ clip }: { clip: TextClip }) {
  const update = (patch: Partial<TextClip>, record = false) => editor().updateClip(clip.id, patch, record);
  const max = Math.max(0.2, Math.min(3, clip.duration / 2));
  const outType = clip.animationOut ?? 'none';
  return (
    <>
      <div className="field-label">{tr('In')}</div>
      <div className="chips">
        {TEXT_ANIMATIONS.map(([id, label]) => (
          <button key={id} className={`chip ${clip.animation === id ? 'active' : ''}`} onClick={() => update({ animation: id }, true)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {clip.animation !== 'none' && (
        <Slider
          label={tr('Duration')}
          value={clip.animationInDuration ?? 0.3}
          min={0.1}
          max={max}
          step={0.1}
          format={seconds}
          onCommit={checkpoint}
          onChange={(animationInDuration) => update({ animationInDuration })}
        />
      )}
      <div className="field-label">{tr('Out')}</div>
      <div className="chips">
        {TEXT_ANIMATIONS.map(([id, label]) => (
          <button key={id} className={`chip ${outType === id ? 'active' : ''}`} onClick={() => update({ animationOut: id }, true)}>
            {tr(label)}
          </button>
        ))}
      </div>
      {outType !== 'none' && (
        <Slider
          label={tr('Duration')}
          value={clip.animationOutDuration ?? 0.3}
          min={0.1}
          max={max}
          step={0.1}
          format={seconds}
          onCommit={checkpoint}
          onChange={(animationOutDuration) => update({ animationOutDuration })}
        />
      )}
    </>
  );
}
