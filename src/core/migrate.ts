import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type Clip, type Project } from './types';

// Eski sürümlerle kaydedilmiş projelere yeni alanların varsayılan değerlerini ekler.
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    markers: project.markers ?? [],
    backgroundBlur: project.backgroundBlur ?? false,
    luts: project.luts ?? {},
    clips: project.clips.map(normalizeClip),
  };
}

function normalizeClip(clip: Clip): Clip {
  if (clip.type === 'text') return clip;
  return {
    ...clip,
    filter: { ...DEFAULT_FILTER, ...clip.filter },
    transform: { ...DEFAULT_TRANSFORM, ...clip.transform },
    speed: clip.speed ?? 1,
    opacity: clip.opacity ?? 1,
    keyframes: clip.keyframes ?? [],
    fadeIn: clip.fadeIn ?? 0,
    fadeOut: clip.fadeOut ?? 0,
    duck: clip.duck ?? false,
  };
}
