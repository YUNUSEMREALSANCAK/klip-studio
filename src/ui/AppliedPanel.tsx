import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { appliedItems, type AppliedItem, type AppliedKind } from '../core/applied';
import { SPEED_CURVES } from '../core/speed';
import { useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import {
  DEFAULT_FILTER,
  type Clip,
  type CustomEffect,
  type FilterSettings,
  type MaskSettings,
  type MediaClip,
  type TextAnimation,
  type TextClip,
  type TransitionType,
} from '../core/types';
import { tr } from '../i18n';
import { isLibraryId } from '../render/effectLibrary';
import { TRANSITION_TYPES } from '../render/shaders';
import { BLEND_MODES, CROP_SIDES, cropFromSides, cropSides, effectName, effectOptions, percent, seconds, transitionLabel } from './clipOptions';
import { Slider, Toggle } from './controls';
import { applyFilterEffect, resolveEffect } from './customActions';
import { setSpeed, setSpeedCurve } from './editActions';
import { EffectEditor } from './EffectEditor';
import { Icon } from './icons';
import { usePanels } from './panelSizes';
import { applyTransition, cutBefore, maxTransitionDuration } from './transitions';

// Every transition and feature used in the video, in timeline order, each on a card with its own settings.

const KIND: Record<AppliedKind, { label: string; icon: string }> = {
  transition: { label: 'Transition', icon: 'transition' },
  effect: { label: 'Effect', icon: 'wand' },
  color: { label: 'Color', icon: 'filter' },
  lut: { label: 'LUT', icon: 'filter' },
  speed: { label: 'Speed', icon: 'speed' },
  slowMotion: { label: 'Smooth slow motion', icon: 'speed' },
  fade: { label: 'Fade', icon: 'volume' },
  blend: { label: 'Blend', icon: 'mask' },
  crop: { label: 'Crop', icon: 'crop' },
  mask: { label: 'Mask', icon: 'mask' },
  chroma: { label: 'Green screen', icon: 'drop' },
  background: { label: 'Background removal', icon: 'ai' },
  keyframes: { label: 'Keyframes', icon: 'move' },
  textAnimation: { label: 'Text animation', icon: 'text' },
};

const ANIMATIONS: [TextAnimation, string][] = [
  ['fade', 'Fade'],
  ['pop', 'Pop'],
  ['slideup', 'Slide up'],
  ['typewriter', 'Typewriter'],
];

const editor = () => useEditor.getState();
const checkpoint = () => editor().checkpoint();
const update = (clip: Clip, patch: Partial<MediaClip> | Partial<TextClip>, record = false) => editor().updateClip(clip.id, patch as Partial<Clip>, record);
const setFilter = (clip: MediaClip, patch: Partial<FilterSettings>, record = false) => update(clip, { filter: { ...clip.filter, ...patch } }, record);

export function AppliedPanel() {
  const project = useEditor((s) => s.project);
  const assets = useEditor((s) => s.assets);
  const selectedId = useEditor((s) => s.selectedId);
  const collapsed = usePanels((s) => s.appliedCollapsed);
  const items = useMemo(() => appliedItems(project), [project]);
  const list = useRef<HTMLDivElement>(null);

  // Bring the selected clip's first card into view.
  useEffect(() => {
    list.current?.querySelector('.applied-card.selected')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (collapsed) {
    return (
      <aside className="applied collapsed">
        <button className="rail-toggle" title={tr('Show applied effects')} onClick={() => usePanels.getState().setAppliedCollapsed(false)}>
          <Icon name="list" size={18} />
          <span className="badge">{items.length}</span>
        </button>
      </aside>
    );
  }

  const clipLabel = (clip: Clip) => (clip.type === 'text' ? `“${clip.text.slice(0, 24)}”` : (assets[clip.assetId]?.name ?? ''));

  return (
    <aside className="applied">
      <header className="applied-header">
        <span>{tr('Applied effects')}</span>
        <span className="count">{items.length}</span>
        <button className="btn ghost icon" title={tr('Hide')} onClick={() => usePanels.getState().setAppliedCollapsed(true)}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="applied-list" ref={list}>
        {items.map((item) => {
          const clip = project.clips.find((c) => c.id === item.clipId)!;
          return <AppliedCard key={item.key} item={item} clip={clip} target={clipLabel(clip)} selected={clip.id === selectedId} effects={project.effects} />;
        })}
      </div>
    </aside>
  );
}

function AppliedCard({
  item,
  clip,
  target,
  selected,
  effects,
}: {
  item: AppliedItem;
  clip: Clip;
  target: string;
  selected: boolean;
  effects: Record<string, CustomEffect>;
}) {
  const card = cardContent(item, clip, effects);
  if (!card) return null;
  const where = item.kind === 'transition' ? `${tr('Cut')} ${cutBefore(clip.id)?.index ?? ''}` : target;
  return (
    <section className={`applied-card ${selected ? 'selected' : ''}`} data-kind={item.kind}>
      <div className="applied-card-head">
        <button
          className="applied-card-title"
          onClick={() => {
            editor().select(clip.id);
            editor().setTime(item.time);
          }}
        >
          <Icon name={KIND[item.kind].icon} size={14} />
          <span>
            <span className="kind">{tr(KIND[item.kind].label)}</span> · <b>{card.name}</b>
          </span>
        </button>
        <button className="btn ghost icon" title={tr('Remove')} aria-label={`${tr('Remove')} ${card.name}`} onClick={card.remove}>
          <Icon name="close" size={13} />
        </button>
      </div>
      <div className="applied-card-where">
        {where} · {formatTime(item.time)}
      </div>
      {card.body && <div className="applied-card-body">{card.body}</div>}
    </section>
  );
}

interface CardContent {
  name: string;
  remove: () => void;
  body?: ReactNode;
}

function cardContent(item: AppliedItem, clip: Clip, effects: Record<string, CustomEffect>): CardContent | null {
  if (clip.type === 'text') {
    if (item.kind !== 'textAnimation') return null;
    return {
      name: tr(ANIMATIONS.find(([id]) => id === clip.animation)?.[1] ?? clip.animation),
      remove: () => update(clip, { animation: 'none' }, true),
      body: (
        <div className="chips">
          {ANIMATIONS.map(([id, label]) => (
            <button key={id} className={`chip ${clip.animation === id ? 'active' : ''}`} onClick={() => update(clip, { animation: id }, true)}>
              {tr(label)}
            </button>
          ))}
        </div>
      ),
    };
  }

  switch (item.kind) {
    case 'transition':
      return transitionCard(clip, effects);
    case 'effect': {
      const id = clip.filter.effectId!;
      return {
        name: effectName(effects, id),
        remove: () => applyFilterEffect(clip.id, null),
        body: <EffectBody clip={clip} effects={effects} />,
      };
    }
    case 'color':
      return {
        name: tr('Adjusted'),
        remove: () =>
          update(
            clip,
            {
              filter: {
                ...DEFAULT_FILTER,
                lutId: clip.filter.lutId,
                lutIntensity: clip.filter.lutIntensity,
                effectId: clip.filter.effectId,
                effectAmount: clip.filter.effectAmount,
              },
            },
            true,
          ),
        body: <ColorBody clip={clip} />,
      };
    case 'lut':
      return {
        name: editor().project.luts[clip.filter.lutId!]?.name ?? 'LUT',
        remove: () => setFilter(clip, { lutId: undefined }, true),
        body: (
          <Slider
            label={tr('Intensity')}
            value={clip.filter.lutIntensity}
            min={0}
            max={1}
            format={percent}
            onCommit={checkpoint}
            onChange={(lutIntensity) => setFilter(clip, { lutIntensity })}
          />
        ),
      };
    case 'speed':
      return {
        name: clip.speedCurve ? tr(clip.speedCurve.name) : `${Number(clip.speed.toFixed(2))}×`,
        remove: () => setSpeed(clip, 1),
        body: clip.speedCurve ? (
          <select value={clip.speedCurve.name} onChange={(e) => setSpeedCurve(clip, SPEED_CURVES.find((c) => c.name === e.target.value) ?? null)}>
            {SPEED_CURVES.map((c) => (
              <option key={c.name} value={c.name}>
                {tr(c.name)}
              </option>
            ))}
          </select>
        ) : (
          <Slider
            label={tr('Speed')}
            value={clip.speed}
            min={0.25}
            max={4}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onCommit={() => {}}
            onChange={(v) => setSpeed(clip, v)}
          />
        ),
      };
    case 'slowMotion':
      return {
        name: clip.slowMotion === 'ai' ? tr('AI frames (RIFE)') : tr('Frame blending'),
        remove: () => update(clip, { slowMotion: undefined }, true),
        body: (
          <div className="chips">
            {(['blend', 'ai'] as const).map((mode) => (
              <button key={mode} className={`chip ${clip.slowMotion === mode ? 'active' : ''}`} onClick={() => update(clip, { slowMotion: mode }, true)}>
                {mode === 'ai' ? tr('AI frames (RIFE)') : tr('Frame blending')}
              </button>
            ))}
          </div>
        ),
      };
    case 'fade':
      return {
        name: [clip.fadeIn > 0 && tr('In'), clip.fadeOut > 0 && tr('Out')].filter(Boolean).join(' + '),
        remove: () => update(clip, { fadeIn: 0, fadeOut: 0 }, true),
        body: (
          <>
            <Slider
              label={tr('Fade in')}
              value={clip.fadeIn}
              min={0}
              max={Math.min(5, clip.duration / 2)}
              step={0.1}
              format={seconds}
              onCommit={checkpoint}
              onChange={(fadeIn) => update(clip, { fadeIn })}
            />
            <Slider
              label={tr('Fade out')}
              value={clip.fadeOut}
              min={0}
              max={Math.min(5, clip.duration / 2)}
              step={0.1}
              format={seconds}
              onCommit={checkpoint}
              onChange={(fadeOut) => update(clip, { fadeOut })}
            />
          </>
        ),
      };
    case 'blend':
      return {
        name: tr(BLEND_MODES.find(([id]) => id === clip.blend)?.[1] ?? ''),
        remove: () => update(clip, { blend: 'normal' }, true),
        body: (
          <select value={clip.blend} onChange={(e) => update(clip, { blend: e.target.value as MediaClip['blend'] }, true)}>
            {BLEND_MODES.map(([id, label]) => (
              <option key={id} value={id}>
                {tr(label)}
              </option>
            ))}
          </select>
        ),
      };
    case 'crop':
      return {
        name: percent(clip.crop!.width * clip.crop!.height),
        remove: () => update(clip, { crop: undefined }, true),
        body: CROP_SIDES.map(([side, label]) => (
          <Slider
            key={side}
            label={tr(label)}
            value={cropSides(clip.crop)[side]}
            min={0}
            max={0.45}
            format={percent}
            onCommit={checkpoint}
            onChange={(value) => update(clip, { crop: cropFromSides({ ...cropSides(clip.crop), [side]: value }) })}
          />
        )),
      };
    case 'mask': {
      const mask = clip.mask!;
      const setMask = (patch: Partial<MaskSettings>, record = false) => update(clip, { mask: { ...mask, ...patch } }, record);
      return {
        name: tr({ rect: 'Rectangle', ellipse: 'Ellipse', linear: 'Linear' }[mask.shape]),
        remove: () => update(clip, { mask: undefined }, true),
        body: (
          <>
            <Slider
              label={tr('Feather')}
              value={mask.feather}
              min={0}
              max={0.5}
              format={percent}
              onCommit={checkpoint}
              onChange={(feather) => setMask({ feather })}
            />
            <Toggle label={tr('Invert')} on={mask.invert} onChange={(invert) => setMask({ invert }, true)} />
          </>
        ),
      };
    }
    case 'chroma': {
      const chroma = clip.chroma!;
      return {
        name: chroma.color,
        remove: () => update(clip, { chroma: undefined }, true),
        body: (
          <>
            <Slider
              label={tr('Similarity')}
              value={chroma.similarity}
              min={0}
              max={1}
              format={percent}
              onCommit={checkpoint}
              onChange={(similarity) => update(clip, { chroma: { ...chroma, similarity } })}
            />
            <Slider
              label={tr('Smoothness')}
              value={chroma.smoothness}
              min={0}
              max={1}
              format={percent}
              onCommit={checkpoint}
              onChange={(smoothness) => update(clip, { chroma: { ...chroma, smoothness } })}
            />
          </>
        ),
      };
    }
    case 'background':
      return { name: tr('People'), remove: () => update(clip, { removeBackground: false }, true) };
    case 'keyframes': {
      const props = [...new Set(clip.keyframes.map((k) => k.prop))];
      return {
        name: `${clip.keyframes.length}`,
        remove: () => update(clip, { keyframes: [] }, true),
        body: <div className="hint">{props.map((p) => tr(KEYFRAME_PROPS[p])).join(', ')}</div>,
      };
    }
    default:
      return null;
  }
}

const KEYFRAME_PROPS: Record<string, string> = {
  x: 'Horizontal position',
  y: 'Vertical position',
  scale: 'Size',
  rotation: 'Rotation',
  opacity: 'Opacity',
  volume: 'Volume',
};

function transitionCard(clip: MediaClip, effects: Record<string, CustomEffect>): CardContent | null {
  const cut = cutBefore(clip.id);
  const transition = clip.transition;
  if (!cut || !transition) return null;
  const options = effectOptions(effects, 'transition');
  return {
    name: transition.effectId ? effectName(effects, transition.effectId) : transitionLabel(transition.type),
    remove: () => applyTransition(cut, null),
    body: (
      <>
        <select
          value={transition.effectId ?? transition.type}
          onChange={(e) => {
            const value = e.target.value;
            if (options.some((o) => o.id === value)) applyTransition(cut, 'fade', undefined, resolveEffect(value, 'transition'));
            else applyTransition(cut, value as TransitionType);
          }}
        >
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
        <Slider
          label={tr('Duration')}
          value={transition.duration}
          min={0.2}
          max={maxTransitionDuration(cut)}
          step={0.1}
          format={seconds}
          onCommit={checkpoint}
          onChange={(duration) => update(clip, { transition: { ...transition, duration } })}
        />
        <button className="btn small" onClick={() => applyTransition(cut, transition.type, undefined, transition.effectId)}>
          {tr('▶ Preview transition')}
        </button>
      </>
    ),
  };
}

function EffectBody({ clip, effects }: { clip: MediaClip; effects: Record<string, CustomEffect> }) {
  const [editing, setEditing] = useState(false);
  const id = clip.filter.effectId!;
  const custom = !isLibraryId(id) ? effects[id] : undefined;
  return (
    <>
      <Slider
        label={tr('Intensity')}
        value={clip.filter.effectAmount}
        min={0}
        max={1}
        format={percent}
        onCommit={checkpoint}
        onChange={(effectAmount) => setFilter(clip, { effectAmount })}
      />
      <div className="row">
        <select value={id} onChange={(e) => applyFilterEffect(clip.id, e.target.value)}>
          {effectOptions(effects, 'filter').map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {custom && (
          <button className="btn small" style={{ flex: 'none' }} onClick={() => setEditing(true)}>
            {tr('Edit code')}
          </button>
        )}
      </div>
      {editing && custom && <EffectEditor kind="filter" effect={custom} onClose={() => setEditing(false)} />}
    </>
  );
}

const COLOR_SLIDERS: [keyof FilterSettings, string, number][] = [
  ['brightness', 'Brightness', -1],
  ['contrast', 'Contrast', -1],
  ['saturation', 'Saturation', -1],
  ['temperature', 'Temperature', -1],
  ['sharpen', 'Sharpness', 0],
  ['vignette', 'Vignette', 0],
];

// Only the adjustments that were changed, so the card stays short.
function ColorBody({ clip }: { clip: MediaClip }) {
  const changed = COLOR_SLIDERS.filter(([key]) => clip.filter[key] !== DEFAULT_FILTER[key]);
  return (
    <>
      {changed.map(([key, label, min]) => (
        <Slider
          key={key}
          label={tr(label)}
          value={clip.filter[key] as number}
          min={min}
          max={1}
          onCommit={checkpoint}
          onChange={(value) => setFilter(clip, { [key]: value })}
        />
      ))}
      {clip.filter.grayscale && <Toggle label={tr('Black & white')} on onChange={(grayscale) => setFilter(clip, { grayscale }, true)} />}
    </>
  );
}
