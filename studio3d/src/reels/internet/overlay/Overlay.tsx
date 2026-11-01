import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PerspectiveCamera, Vector3} from 'three';
import {cameraPose} from '../../../kit/three/camera';
import {C, fontFamily, mono} from '../../../kit/theme';
import {CHAPTERS, LABELS, RENDER_STEPS, RENDER_STEPS_RANGE, type Label} from './labels';

/* Post-prodüksiyon katmanı: 3D nesnelere iliştirilmiş teknik etiketler, bölüm etiketi, render şeridi */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const projector = new PerspectiveCamera(38, 9 / 16, 0.05, 4000);
const tmp = new Vector3();

/** 3D noktanın o karedeki ekran konumu (CameraRig ile birebir aynı kamera) */
const project = (label: Label, t: number, width: number, height: number) => {
  if (!label.anchor) return null;
  const pose = cameraPose(label.anchor.cam, t);
  projector.aspect = width / height;
  projector.fov = pose.fov;
  projector.position.set(...pose.position);
  projector.up.set(...pose.up);
  projector.lookAt(...pose.look);
  projector.updateProjectionMatrix();
  projector.updateMatrixWorld();
  tmp.set(...label.anchor.point).project(projector);
  if (tmp.z > 1) return null;
  return {x: ((tmp.x + 1) / 2) * width, y: ((1 - tmp.y) / 2) * height};
};

const Pill: React.FC<{title: string; sub?: string; subOn: number; mono?: boolean; accent?: string}> = ({title, sub, subOn, mono: isMono, accent = C.cyan}) => (
  <div
    style={{
      background: 'rgba(3, 10, 28, 0.74)',
      border: `2px solid ${accent}99`,
      borderRadius: 18,
      padding: '16px 26px',
      boxShadow: `0 0 34px ${accent}44, inset 0 0 18px ${accent}22`,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      whiteSpace: 'nowrap',
    }}
  >
    <div style={{fontFamily: isMono ? mono : fontFamily, fontWeight: 800, fontSize: 46, color: C.white, letterSpacing: -0.5, lineHeight: 1.1}}>{title}</div>
    {sub ? (
      <div style={{fontFamily: mono, fontWeight: 500, fontSize: 30, color: C.cyanSoft, opacity: subOn, height: 38 * subOn, overflow: 'hidden'}}>{sub}</div>
    ) : null}
  </div>
);

const AnchoredLabel: React.FC<{label: Label; t: number}> = ({label, t}) => {
  const {width, height} = useVideoConfig();
  const inP = easeOut(interpolate(t, [label.from, label.from + 0.35], [0, 1], clamp));
  const outP = interpolate(t, [label.to - 0.25, label.to], [1, 0], clamp);
  const subOn = label.sub ? easeOut(interpolate(t, [label.subAt ?? label.from, (label.subAt ?? label.from) + 0.3], [0, 1], clamp)) : 0;
  const opacity = inP * outP;
  if (opacity <= 0) return null;

  if (label.fixed) {
    return (
      <div style={{position: 'absolute', left: label.fixed.x, top: label.fixed.y, translate: `-50% ${(1 - inP) * 20}px`, opacity}}>
        <Pill title={label.title} sub={label.sub} subOn={subOn} mono={label.mono} />
      </div>
    );
  }

  const pt = project(label, t, width, height);
  if (!pt) return null;
  // Kutu genişliği tahmini: sığmıyorsa diğer tarafa geç, yine de sığmazsa kenara yasla
  const boxW = Math.max(label.title.length * 27, (label.sub?.length ?? 0) * 18) + 60;
  const margin = 40;
  const lineLen = 70 * inP;
  let side = label.anchor?.side ?? 'right';
  if (side === 'right' && pt.x + lineLen + 50 + boxW > width - margin) side = 'left';
  else if (side === 'left' && pt.x - lineLen - 50 - boxW < margin) side = 'right';
  const dir = side === 'right' ? 1 : -1;
  const tx = pt.x + dir * (lineLen + 50);
  const boxX = side === 'right' ? Math.min(Math.max(tx, margin), width - margin - boxW) : Math.max(Math.min(tx, width - margin), margin + boxW);
  const boxY = Math.min(Math.max(pt.y - (lineLen + 50), 240), height - 420);
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        <circle cx={pt.x} cy={pt.y} r={10 * inP} fill={C.white} />
        <circle cx={pt.x} cy={pt.y} r={22 * inP} fill="none" stroke={C.cyan} strokeWidth={3} opacity={0.8} />
        <polyline points={`${pt.x},${pt.y} ${pt.x + dir * lineLen},${pt.y - lineLen} ${boxX},${boxY}`} fill="none" stroke={C.cyan} strokeWidth={3} opacity={0.9} />
      </svg>
      <div style={{position: 'absolute', left: boxX, top: boxY, translate: `${side === 'right' ? '0%' : '-100%'} -50%`, scale: `${0.9 + inP * 0.1}`}}>
        <Pill title={label.title} sub={label.sub} subOn={subOn} mono={label.mono} />
      </div>
    </div>
  );
};

const ChapterTag: React.FC<{t: number}> = ({t}) => {
  const ch = CHAPTERS.find((c) => t >= c.from && t < c.to);
  if (!ch) return null;
  const inP = easeOut(interpolate(t, [ch.from, ch.from + 0.5], [0, 1], clamp));
  const outP = interpolate(t, [ch.to - 0.2, ch.to], [1, 0], clamp);
  const flash = interpolate(t, [ch.from, ch.from + 0.25, ch.from + 1.2], [0, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 64, top: 150, opacity: inP * outP, translate: `${(1 - inP) * -40}px 0`, display: 'flex', alignItems: 'center', gap: 16}}>
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: 30,
          color: C.bg,
          background: C.cyan,
          borderRadius: 10,
          padding: '6px 12px',
          boxShadow: `0 0 ${20 + flash * 40}px ${C.cyan}`,
        }}
      >
        {ch.n}
      </div>
      <div style={{fontFamily, fontWeight: 800, fontSize: 40, color: C.white, letterSpacing: 1, textTransform: 'uppercase', textShadow: `0 0 ${flash * 30}px ${C.cyan}`}}>{ch.title}</div>
    </div>
  );
};

const RenderSteps: React.FC<{t: number}> = ({t}) => {
  const [a, b] = RENDER_STEPS_RANGE;
  const opacity = interpolate(t, [a, a + 0.3, b - 0.3, b], [0, 1, 1, 0], clamp);
  if (opacity <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 300, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, opacity}}>
      {RENDER_STEPS.map((s, i) => {
        const on = interpolate(t, [s.at - 0.1, s.at + 0.15], [0, 1], clamp);
        const active = t >= s.at && (i === RENDER_STEPS.length - 1 || t < RENDER_STEPS[i + 1].at);
        return (
          <div
            key={s.title}
            style={{
              fontFamily,
              fontWeight: 800,
              fontSize: 40,
              padding: '12px 22px',
              borderRadius: 16,
              color: on > 0.5 ? C.white : '#5b6c93',
              background: active ? 'rgba(34, 227, 255, 0.18)' : 'rgba(3, 10, 28, 0.7)',
              border: `2px solid ${active ? C.cyan : on > 0.5 ? '#3f5ea8' : '#1c2a4d'}`,
              boxShadow: active ? `0 0 30px ${C.cyan}66` : 'none',
              scale: `${active ? 1.06 : 1}`,
            }}
          >
            {s.title}
          </div>
        );
      })}
    </div>
  );
};

/** Klip projesine ayrı ayrı aktarılan katman parçaları (her biri kendi şeffaf videosu olur) */
export type OverlayPart = {id: string; name: string; from: number; to: number};

export const OVERLAY_PARTS: OverlayPart[] = [
  ...CHAPTERS.map((c, i) => ({id: `chapter-${i}`, name: `Bölüm ${c.n} ${c.title}`, from: c.from, to: c.to})),
  {id: 'steps', name: 'Render adımları', from: RENDER_STEPS_RANGE[0], to: RENDER_STEPS_RANGE[1]},
  ...LABELS.map((l, i) => ({id: `label-${i}`, name: `Etiket: ${l.title}`, from: l.from, to: l.to})),
];

/** part verilirse yalnızca o parça çizilir (Klip projesi için parça parça render) */
export const Overlay: React.FC<{part?: string}> = ({part}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const show = (id: string) => !part || part === id;
  const chapterIndex = CHAPTERS.findIndex((c) => t >= c.from && t < c.to);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {chapterIndex >= 0 && show(`chapter-${chapterIndex}`) ? <ChapterTag t={t} /> : null}
      {show('steps') ? <RenderSteps t={t} /> : null}
      {LABELS.map((l, i) => (show(`label-${i}`) && t >= l.from - 0.05 && t <= l.to + 0.05 ? <AnchoredLabel key={i} label={l} t={t} /> : null))}
    </AbsoluteFill>
  );
};
