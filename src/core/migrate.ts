import { DEFAULT_FILTER, type Clip, type Project } from './types';

// Eski sürümlerle kaydedilmiş projelere yeni alanların varsayılan değerlerini ekler.
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    markers: project.markers ?? [],
    clips: project.clips.map(normalizeClip),
  };
}

function normalizeClip(clip: Clip): Clip {
  if (clip.type === 'text') return clip;
  return {
    ...clip,
    filter: { ...DEFAULT_FILTER, ...clip.filter },
    transform: Object.assign({ x: 0.5, y: 0.5, scale: 1 }, clip.transform),
  };
}
