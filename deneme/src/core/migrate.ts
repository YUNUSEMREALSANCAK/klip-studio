import { DEFAULT_FILTER, DEFAULT_TRANSFORM, type Clip, type Project } from './types';

// Adds default values for new fields to projects saved by older versions.
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    markers: project.markers ?? [],
    backgroundBlur: project.backgroundBlur ?? false,
    luts: project.luts ?? {},
    effects: project.effects ?? {},
    fonts: project.fonts ?? {},
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
    // v0.4 smoothSlowMo on/off field → slowMotion
    slowMotion: clip.slowMotion ?? ((clip as { smoothSlowMo?: boolean }).smoothSlowMo ? 'blend' : undefined),
  };
}
