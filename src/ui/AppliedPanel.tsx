import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { appliedItems, type AppliedItem, type AppliedKind } from '../core/applied';
import { SPEED_CURVES } from '../core/speed';
import { useEditor } from '../core/store';
import { formatTime } from '../core/timeline';
import { DEFAULT_FILTER, type Clip, type CustomEffect, type FilterSettings, type MaskSettings, type MediaClip, type TextClip } from '../core/types';
import { tr } from '../i18n';
import { BLEND_MODES, CROP_SIDES, cropFromSides, cropSides, effectName, percent, seconds, transitionLabel } from './clipOptions';
import { Slider, Toggle } from './controls';
import { applyFilterEffect } from './customActions';
import { setSpeed, setSpeedCurve } from './editActions';
import { Icon } from './icons';
import { usePanels } from './panelSizes';
import { EffectSettings, MOTIONS, MotionSettings, TEXT_ANIMATIONS, TextAnimationSettings, TransitionSettings } from './settings';
import { applyTransition, cutBefore } from './transitions';

// Every transition and feature used in the video, in timeline order, each on a card with all of its settings.

const KIND: Record<AppliedKind, { label: string; icon: string }> = {
  transition: { label: 'Transition', icon: 'transition' },
  effect: { label: 'Effect', icon: 'wand' },
  color: { label: 'Color', icon: 'filter' },
  lut: { label: 'LUT', icon: 'filter' },
  speed: { label: 'Speed', icon: 'speed' },
  slowMotion: { label: 'Smooth slow motion', icon: 'speed' },
  motion: { label: 'Animation', icon: 'move' },
  fade: { label: 'Audio fade', icon: 'volume' },
  blend: { label: 'Blend', icon: 'mask' },
  crop: { label: 'Crop', icon: 'crop' },
  mask: { label: 'Mask', icon: 'mask' },
  chroma: { label: 'Green screen', icon: 'drop' },
  background: { label: 'Background removal', icon: 'ai' },
  keyframes: { label: 'Keyframes', icon: 'move' },
  textAnimation: { label: 'Text animation', icon: 'text' },
};

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];
const KEYFRAME_PROPS: Record<string, string> = {
  x: 'Horizontal position',
  y: 'Vertical position',
  scale: 'Size',
  rotation: 'Rotation',
  opacity: 'Opacity',
  volume: 'Volume',
};
const COLOR_SLIDERS: [keyof FilterSettings, string, number][] = [
  ['brightness', 'Brightness', -1],
  ['contrast', 'Contrast', -1],
  ['saturation', 'Saturation', -1],
  ['temperature', 'Temperature', -1],
  ['sharpen', 'Sharpness', 0],
  ['vignette', 'Vignette', 0],
];
const MASK_SHAPES: [MaskSettings['shape'], string][] = [
  ['rect', 'Rectangle'],
  ['ellipse', 'Ellipse'],
  ['linear', 'Linear'],
];

const editor = () => useEditor.getState();
const checkpoint = () => editor().checkpoint();
const update = (clip: Clip, patch: Partial<MediaClip> | Partial<TextClip>, record = false) => editor().updateClip(clip.id, patch as Partial<Clip>, record);
const setFilter = (clip: MediaClip, patch: Partial<FilterSettings>, record = false) => update(clip, { filter: { ...clip.filter, ...patch } }, record);
const labelOf = <T extends string>(list: [T, string][], id: T | undefined) => tr(list.find(([key]) => key === id)?.[1] ?? '');

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
    const names = [
      clip.animation !== 'none' && labelOf(TEXT_ANIMATIONS, clip.animation),
      clip.animationOut && clip.animationOut !== 'none' && labelOf(TEXT_ANIMATIONS, clip.animationOut),
    ];
    return {
      name: names.filter(Boolean).join(' → '),
      remove: () => update(clip, { animation: 'none', animationOut: 'none' }, true),
      body: <TextAnimationSettings clip={clip} />,
    };
  }

  switch (item.kind) {
    case 'transition': {
      const cut = cutBefore(clip.id);
      const transition = clip.transition;
      if (!cut || !transition) return null;
      return {
        name: transition.effectId ? effectName(effects, transition.effectId) : transitionLabel(transition.type),
        remove: () => applyTransition(cut, null),
        body: <TransitionSettings cut={cut} />,
      };
    }
    case 'effect':
      return { name: effectName(effects, clip.filter.effectId!), remove: () => applyFilterEffect(clip.id, null), body: <EffectSettings clip={clip} /> };
    case 'color':
      return {
        name: tr('Adjusted'),
        remove: () =>
          update(clip, { filter: { ...clip.filter, ...Object.fromEntries(COLOR_SLIDERS.map(([key]) => [key, DEFAULT_FILTER[key]])), grayscale: false } }, true),
        body: (
          <>
            {COLOR_SLIDERS.map(([key, label, min]) => (
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
            <Toggle label={tr('Black & white')} on={clip.filter.grayscale} onChange={(grayscale) => setFilter(clip, { grayscale }, true)} />
          </>
        ),
      };
    case 'lut': {
      const luts = editor().project.luts;
      return {
        name: luts[clip.filter.lutId!]?.name ?? 'LUT',
        remove: () => setFilter(clip, { lutId: undefined }, true),
        body: (
          <>
            <select value={clip.filter.lutId} onChange={(e) => setFilter(clip, { lutId: e.target.value }, true)}>
              {Object.values(luts).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Slider
              label={tr('Intensity')}
              value={clip.filter.lutIntensity}
              min={0}
              max={1}
              format={percent}
              onCommit={checkpoint}
              onChange={(lutIntensity) => setFilter(clip, { lutIntensity })}
            />
          </>
        ),
      };
    }
    case 'speed':
      return {
        name: clip.speedCurve ? tr(clip.speedCurve.name) : `${Number(clip.speed.toFixed(2))}×`,
        remove: () => setSpeed(clip, 1),
        body: (
          <>
            <div className="chips">
              {SPEEDS.map((v) => (
                <button key={v} className={`chip ${!clip.speedCurve && clip.speed === v ? 'active' : ''}`} onClick={() => setSpeed(clip, v)}>
                  {v}×
                </button>
              ))}
            </div>
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
            <div className="field-label">{tr('Speed curve')}</div>
            <div className="chips">
              <button className={`chip ${!clip.speedCurve ? 'active' : ''}`} onClick={() => setSpeedCurve(clip, null)}>
                {tr('None')}
              </button>
              {SPEED_CURVES.map((curve) => (
                <button key={curve.name} className={`chip ${clip.speedCurve?.name === curve.name ? 'active' : ''}`} onClick={() => setSpeedCurve(clip, curve)}>
                  {tr(curve.name)}
                </button>
              ))}
            </div>
          </>
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
    case 'motion':
      return {
        name: [clip.animIn && labelOf(MOTIONS, clip.animIn.type), clip.animOut && labelOf(MOTIONS, clip.animOut.type)].filter(Boolean).join(' → '),
        remove: () => update(clip, { animIn: undefined, animOut: undefined }, true),
        body: <MotionSettings clip={clip} />,
      };
    case 'fade': {
      const max = Math.max(0.1, Math.min(5, clip.duration / 2));
      return {
        name: [clip.fadeIn > 0 && `${tr('In')} ${seconds(clip.fadeIn)}`, clip.fadeOut > 0 && `${tr('Out')} ${seconds(clip.fadeOut)}`]
          .filter(Boolean)
          .join(' · '),
        remove: () => update(clip, { fadeIn: 0, fadeOut: 0 }, true),
        body: (
          <>
            <Slider
              label={tr('Fade in')}
              value={clip.fadeIn}
              min={0}
              max={max}
              step={0.1}
              format={seconds}
              onCommit={checkpoint}
              onChange={(fadeIn) => update(clip, { fadeIn })}
            />
            <Slider
              label={tr('Fade out')}
              value={clip.fadeOut}
              min={0}
              max={max}
              step={0.1}
              format={seconds}
              onCommit={checkpoint}
              onChange={(fadeOut) => update(clip, { fadeOut })}
            />
            <Slider
              label={tr('Volume')}
              value={clip.volume}
              min={0}
              max={2}
              format={percent}
              onCommit={checkpoint}
              onChange={(volume) => update(clip, { volume })}
            />
          </>
        ),
      };
    }
    case 'blend':
      return {
        name: labelOf(BLEND_MODES, clip.blend),
        remove: () => update(clip, { blend: 'normal' }, true),
        body: (
          <>
            <select value={clip.blend} onChange={(e) => update(clip, { blend: e.target.value as MediaClip['blend'] }, true)}>
              {BLEND_MODES.map(([id, label]) => (
                <option key={id} value={id}>
                  {tr(label)}
                </option>
              ))}
            </select>
            <Slider
              label={tr('Opacity')}
              value={clip.opacity}
              min={0}
              max={1}
              format={percent}
              onCommit={checkpoint}
              onChange={(opacity) => update(clip, { opacity })}
            />
          </>
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
        name: labelOf(MASK_SHAPES, mask.shape),
        remove: () => update(clip, { mask: undefined }, true),
        body: (
          <>
            <div className="chips">
              {MASK_SHAPES.map(([shape, label]) => (
                <button key={shape} className={`chip ${mask.shape === shape ? 'active' : ''}`} onClick={() => setMask({ shape }, true)}>
                  {tr(label)}
                </button>
              ))}
            </div>
            <Slider label={tr('Horizontal position')} value={mask.x} min={0} max={1} format={percent} onCommit={checkpoint} onChange={(x) => setMask({ x })} />
            <Slider label={tr('Vertical position')} value={mask.y} min={0} max={1} format={percent} onCommit={checkpoint} onChange={(y) => setMask({ y })} />
            {mask.shape !== 'linear' && (
              <>
                <Slider
                  label={tr('Width')}
                  value={mask.width}
                  min={0.05}
                  max={1.5}
                  format={percent}
                  onCommit={checkpoint}
                  onChange={(width) => setMask({ width })}
                />
                <Slider
                  label={tr('Height')}
                  value={mask.height}
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
            <div className="toggle">
              <span>{tr('Key color')}</span>
              <input type="color" value={chroma.color} onFocus={checkpoint} onChange={(e) => update(clip, { chroma: { ...chroma, color: e.target.value } })} />
            </div>
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
    case 'keyframes':
      return {
        name: `${clip.keyframes.length}`,
        remove: () => update(clip, { keyframes: [] }, true),
        body: (
          <ul className="keyframe-list">
            {[...clip.keyframes]
              .sort((a, b) => a.time - b.time)
              .map((k) => (
                <li key={`${k.prop}-${k.time}`}>
                  <button className="link" onClick={() => editor().setTime(clip.start + k.time)}>
                    {formatTime(clip.start + k.time)}
                  </button>
                  <span>{tr(KEYFRAME_PROPS[k.prop])}</span>
                  <span className="value">{k.prop === 'rotation' ? `${Math.round(k.value)}°` : percent(k.value)}</span>
                  <button
                    className="btn ghost icon"
                    title={tr('Remove')}
                    onClick={() => update(clip, { keyframes: clip.keyframes.filter((other) => other !== k) }, true)}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
          </ul>
        ),
      };
    default:
      return null;
  }
}
