import type { ReactNode } from 'react';
import { keyframeAt, setValue, toggleKeyframe, valueAt } from '../core/animation';
import { useEditor } from '../core/store';
import type { KeyframeProp, MediaClip } from '../core/types';

export function Slider({ label, value, min, max, step = 0.01, format, onChange, onCommit, extra }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onCommit: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="field">
      <label>
        <span className="label-main">
          {extra}
          {label}
        </span>
        <span>{format ? format(value) : Math.round(value * 100)}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onCommit} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="toggle">
      <span>{label}</span>
      <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label} />
    </div>
  );
}

// Açılır-kapanır bölüm; uzun özellik listesini derli toplu tutar.
export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary className="section-title">{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

// Anahtar kare destekli kaydırıcı: ◆ ile oynatma çizgisinde kare ekler/siler; değer o anki animasyondan okunur.
export function KeySlider({ clip, prop, label, min, max, format }: {
  clip: MediaClip;
  prop: KeyframeProp;
  label: string;
  min: number;
  max: number;
  format?: (v: number) => string;
}) {
  const time = useEditor((s) => s.time);
  const active = !!keyframeAt(clip, prop, time);
  const animated = clip.keyframes.some((k) => k.prop === prop);
  const s = () => useEditor.getState();
  return (
    <Slider
      label={label}
      value={valueAt(clip, prop, time)}
      min={min}
      max={max}
      format={format}
      onCommit={() => s().checkpoint()}
      onChange={(v) => s().updateClip(clip.id, setValue(clip, prop, v, s().time) as Partial<MediaClip>, false)}
      extra={
        <button
          className={`key-toggle ${active ? 'on' : animated ? 'animated' : ''}`}
          title={active ? 'Bu anahtar kareyi sil' : 'Oynatma çizgisine anahtar kare ekle'}
          onClick={(e) => {
            e.preventDefault();
            s().updateClip(clip.id, toggleKeyframe(clip, prop, s().time) as Partial<MediaClip>);
          }}
        >
          ◆
        </button>
      }
    />
  );
}
