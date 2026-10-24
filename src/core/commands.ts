import { SPEED_CURVES } from './speed';
import { useEditor } from './store';
import { clipEnd, createMediaClip, createTextClip, formatTime, projectDuration, rippleDelete, sortedTrack, splitClip } from './timeline';
import { FILTER_API, TRANSITION_API } from '../render/effects';
import { fontFamilies } from '../render/fonts';
import type { AspectRatio, Clip, CustomEffect, MediaClip, TextClip, TransitionType } from './types';

// Command layer: every edit is a typed JSON command. It is the single entry point for driving
// the editor from outside the UI (browser API, MCP server, natural-language panel).
// Every command is undoable; it is recorded in history.

export type Command =
  | { name: 'get_state' }
  | { name: 'add_media'; assetId: string; track?: 'main' | 'overlay' | 'audio'; start?: number }
  | {
      name: 'add_text';
      text: string;
      start?: number;
      duration?: number;
      preset?: TextClip['preset'];
      animation?: TextClip['animation'];
      y?: number;
      font?: string;
      color?: string;
    }
  | { name: 'update_clip'; clipId: string; changes: Record<string, unknown> }
  | { name: 'remove_clip'; clipId: string }
  | { name: 'split'; time: number; clipId?: string }
  | { name: 'delete_range'; start: number; end: number }
  | { name: 'set_transition'; toClipId: string; type?: TransitionType | null; effectId?: string; duration?: number }
  | { name: 'create_effect'; kind: CustomEffect['kind']; title: string; code: string }
  | { name: 'update_effect'; effectId: string; title?: string; code?: string }
  | { name: 'delete_effect'; effectId: string }
  | { name: 'set_filter'; clipId: string; effectId: string | null; amount?: number }
  | { name: 'add_font'; family: string }
  | { name: 'set_speed'; clipId: string; speed?: number; curve?: string | null }
  | { name: 'set_aspect'; aspect: AspectRatio }
  | { name: 'set_background_blur'; enabled: boolean }
  | { name: 'seek'; time: number }
  | { name: 'undo' }
  | { name: 'redo' }
  | { name: 'run_ai'; tool: AiTool; options?: Record<string, unknown> };

export type AiTool = 'captions' | 'remove_silences' | 'remove_fillers' | 'denoise' | 'split_scenes' | 'reframe' | 'enhance' | 'beats' | 'translate' | 'speech';

export interface CommandSpec {
  name: Command['name'];
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (properties only)
  required?: string[];
}

const TRANSITIONS = ['fade', 'fadeblack', 'slideleft', 'slideright', 'slideup', 'wipeleft', 'wiperight', 'circleopen', 'zoomin', 'pixelize', 'radial', 'blur'];

// Command catalog shown to agents (Claude tools and MCP share these definitions).
export const COMMAND_SPECS: CommandSpec[] = [
  { name: 'get_state', description: 'Returns a project summary: assets, clips (id, track, start, duration), total duration, aspect ratio.', parameters: {} },
  {
    name: 'add_media',
    description: 'Adds a library asset to the timeline. On the main track it is appended; on other tracks it is placed at the given start.',
    parameters: {
      assetId: { type: 'string' },
      track: { type: 'string', enum: ['main', 'overlay', 'audio'] },
      start: { type: 'number', description: 'seconds' },
    },
    required: ['assetId'],
  },
  {
    name: 'add_text',
    description: 'Adds a text clip.',
    parameters: {
      text: { type: 'string' },
      start: { type: 'number' },
      duration: { type: 'number' },
      preset: { type: 'string', enum: ['classic', 'box', 'karaoke', 'neon', 'title'] },
      animation: { type: 'string', enum: ['none', 'fade', 'pop', 'typewriter', 'slideup'] },
      y: { type: 'number', description: 'vertical position 0 (top) – 1 (bottom)' },
      font: { type: 'string' },
      color: { type: 'string', description: '#rrggbb' },
    },
    required: ['text'],
  },
  {
    name: 'update_clip',
    description:
      'Changes clip fields. Media: volume, muted, speed, opacity, fadeIn, fadeOut, duck, removeBackground, slowMotion, transform {x,y,scale,rotation}, filter {brightness,contrast,saturation,temperature,vignette,sharpen,grayscale}. Text: text, preset, animation, color, fontSize, y, font. Both: start, duration.',
    parameters: { clipId: { type: 'string' }, changes: { type: 'object' } },
    required: ['clipId', 'changes'],
  },
  { name: 'remove_clip', description: 'Removes a clip.', parameters: { clipId: { type: 'string' } }, required: ['clipId'] },
  {
    name: 'split',
    description: 'Splits the given clip (or every clip under the time) at the given second.',
    parameters: { time: { type: 'number' }, clipId: { type: 'string' } },
    required: ['time'],
  },
  {
    name: 'delete_range',
    description: 'Deletes [start, end) from every track and shifts everything after it left (ripple delete).',
    parameters: { start: { type: 'number' }, end: { type: 'number' } },
    required: ['start', 'end'],
  },
  {
    name: 'set_transition',
    description:
      'Sets the transition at the cut before main-track clip toClipId: a built-in type, or a custom transition by effectId (from create_effect). type null removes it.',
    parameters: {
      toClipId: { type: 'string' },
      type: { type: ['string', 'null'], enum: [...TRANSITIONS, null] },
      effectId: { type: 'string', description: 'custom transition id' },
      duration: { type: 'number' },
    },
    required: ['toClipId'],
  },
  {
    name: 'create_effect',
    description: `Creates a custom transition or filter from GLSL code and returns its effectId. The code is compiled first; on a GLSL error nothing is saved and the error log (with line numbers) is returned, so fix it and call again. Apply it with set_transition {effectId} or set_filter. Transition: ${TRANSITION_API} Filter: ${FILTER_API}`,
    parameters: {
      kind: { type: 'string', enum: ['transition', 'filter'] },
      title: { type: 'string', description: 'short display name' },
      code: { type: 'string', description: 'GLSL source' },
    },
    required: ['kind', 'title', 'code'],
  },
  {
    name: 'update_effect',
    description: 'Changes the title or code of a custom effect; clips using it update immediately. Same GLSL rules and errors as create_effect.',
    parameters: { effectId: { type: 'string' }, title: { type: 'string' }, code: { type: 'string' } },
    required: ['effectId'],
  },
  {
    name: 'delete_effect',
    description: 'Deletes a custom effect. Transitions using it fall back to their built-in type; filters are removed.',
    parameters: { effectId: { type: 'string' } },
    required: ['effectId'],
  },
  {
    name: 'set_filter',
    description: 'Applies a custom filter (effectId from create_effect) to a video or image clip, or removes it with null. amount 0–1 (default 1).',
    parameters: { clipId: { type: 'string' }, effectId: { type: ['string', 'null'] }, amount: { type: 'number' } },
    required: ['clipId', 'effectId'],
  },
  {
    name: 'add_font',
    description:
      'Adds a Google Fonts family by its exact name (e.g. "Space Grotesk") so text clips can use it via font. Font files are added with the MCP klip_import_file tool.',
    parameters: { family: { type: 'string' } },
    required: ['family'],
  },
  {
    name: 'set_speed',
    description: `Changes a clip's speed (0.25–4) or speed curve. Curves: ${SPEED_CURVES.map((c) => c.name).join(', ')}; null removes the curve.`,
    parameters: { clipId: { type: 'string' }, speed: { type: 'number' }, curve: { type: ['string', 'null'] } },
    required: ['clipId'],
  },
  {
    name: 'set_aspect',
    description: 'Changes the project aspect ratio.',
    parameters: { aspect: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5'] } },
    required: ['aspect'],
  },
  { name: 'set_background_blur', description: 'Turns blurred-background fill on or off.', parameters: { enabled: { type: 'boolean' } }, required: ['enabled'] },
  { name: 'seek', description: 'Moves the playhead.', parameters: { time: { type: 'number' } }, required: ['time'] },
  { name: 'undo', description: 'Undoes the last change.', parameters: {} },
  { name: 'redo', description: 'Redoes the last undone change.', parameters: {} },
  {
    name: 'run_ai',
    description:
      'Runs a local AI tool and waits for it to finish. captions {language?, model?}; remove_silences {thresholdDb?, minDuration?}; remove_fillers; denoise {clipId}; split_scenes {clipId}; reframe {clipId}; enhance {clipId}; beats {clipId}; translate {src, tgt, bilingual?}; speech {text, voice?}.',
    parameters: {
      tool: {
        type: 'string',
        enum: ['captions', 'remove_silences', 'remove_fillers', 'denoise', 'split_scenes', 'reframe', 'enhance', 'beats', 'translate', 'speech'],
      },
      options: { type: 'object' },
    },
    required: ['tool'],
  },
];

const editor = () => useEditor.getState();

function summarize() {
  const { project, assets, time } = editor();
  const describe = (c: Clip) =>
    c.type === 'text'
      ? { id: c.id, track: c.track, start: round(c.start), duration: round(c.duration), text: c.text, font: c.font }
      : {
          id: c.id,
          track: c.track,
          start: round(c.start),
          duration: round(c.duration),
          asset: assets[c.assetId]?.name,
          speed: c.speed,
          transition: c.transition && (c.transition.effectId ?? c.transition.type),
          filter: c.filter.effectId,
        };
  return {
    aspect: project.aspect,
    duration: round(projectDuration(project.clips)),
    playhead: round(time),
    effects: Object.values(project.effects).map(({ id, name, kind }) => ({ id, name, kind })),
    fonts: fontFamilies(project.fonts),
    assets: Object.values(assets).map((a) => ({ id: a.id, name: a.name, kind: a.kind, duration: Number.isFinite(a.duration) ? round(a.duration) : null })),
    clips: [...project.clips].sort((a, b) => a.start - b.start).map(describe),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

function requireClip(id: string): Clip {
  const clip = editor().project.clips.find((c) => c.id === id);
  if (!clip) throw new Error(`Clip not found: ${id}`);
  return clip;
}

// Merges allowed fields; nested objects (transform, filter) are partially updated.
function applyChanges(clip: Clip, changes: Record<string, unknown>): Partial<Clip> {
  const allowed =
    clip.type === 'text'
      ? ['start', 'duration', 'text', 'preset', 'animation', 'color', 'highlight', 'fontSize', 'y', 'font']
      : ['start', 'duration', 'volume', 'muted', 'speed', 'opacity', 'fadeIn', 'fadeOut', 'duck', 'removeBackground', 'transform', 'filter', 'slowMotion'];
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!allowed.includes(key)) throw new Error(`Field cannot be changed: ${key}`);
    const current = (clip as unknown as Record<string, unknown>)[key];
    patch[key] = value && typeof value === 'object' && current && typeof current === 'object' ? { ...current, ...value } : value;
  }
  if (clip.type === 'text' && 'text' in patch) patch.words = undefined;
  return patch as Partial<Clip>;
}

// Runs a command and returns its result. Waits for AI commands to finish.
export async function execute(command: Command): Promise<unknown> {
  const s = editor();
  switch (command.name) {
    case 'get_state':
      return summarize();
    case 'add_media': {
      const asset = s.assets[command.assetId];
      if (!asset) throw new Error(`Asset not found: ${command.assetId}`);
      const track = command.track ?? (asset.kind === 'audio' ? 'audio' : 'main');
      const start = track === 'main' ? sortedTrack(s.project.clips, 'main').reduce((end, c) => Math.max(end, clipEnd(c)), 0) : (command.start ?? s.time);
      const clip = createMediaClip(asset, track, start);
      s.mutate((clips) => [...clips, clip]);
      return { clipId: clip.id };
    }
    case 'add_text': {
      const clip: TextClip = {
        ...createTextClip(command.start ?? s.time, command.text, command.duration ?? 3),
        ...(command.preset && { preset: command.preset }),
        ...(command.animation && { animation: command.animation }),
        ...(command.y !== undefined && { y: command.y }),
        ...(command.font && { font: command.font }),
        ...(command.color && { color: command.color }),
      };
      s.mutate((clips) => [...clips, clip]);
      return { clipId: clip.id };
    }
    case 'update_clip': {
      const clip = requireClip(command.clipId);
      s.updateClip(clip.id, applyChanges(clip, command.changes));
      return { ok: true };
    }
    case 'remove_clip':
      requireClip(command.clipId);
      s.removeClip(command.clipId);
      return { ok: true };
    case 'split': {
      const targets = s.project.clips.filter((c) => (command.clipId ? c.id === command.clipId : true) && command.time > c.start && command.time < clipEnd(c));
      if (!targets.length) throw new Error(`No clip to split at ${formatTime(command.time)}`);
      s.mutate((clips) => clips.flatMap((c) => (targets.includes(c) ? (splitClip(c, command.time) ?? [c]) : [c])));
      return { splitClips: targets.length };
    }
    case 'delete_range':
      if (command.end <= command.start) throw new Error('End must be after start');
      s.mutate((clips) => rippleDelete(clips, command.start, command.end));
      return { removedSeconds: round(command.end - command.start) };
    case 'set_transition': {
      const clip = requireClip(command.toClipId) as MediaClip;
      const main = sortedTrack<MediaClip>(s.project.clips, 'main');
      const index = main.findIndex((c) => c.id === clip.id);
      if (index < 1) throw new Error('Transitions go on main-track clips other than the first');
      const duration = Math.min(command.duration ?? clip.transition?.duration ?? 0.8, main[index - 1].duration, clip.duration);
      if (command.effectId && s.project.effects[command.effectId]?.kind !== 'transition') throw new Error(`Custom transition not found: ${command.effectId}`);
      const type = command.type ?? (command.effectId ? 'fade' : null);
      s.updateClip(clip.id, {
        transition: type ? { type, duration, ...(command.effectId && { effectId: command.effectId }) } : undefined,
      } as Partial<MediaClip>);
      return { ok: true };
    }
    case 'create_effect': {
      const { saveEffect } = await import('../ui/customActions');
      return { effectId: saveEffect({ kind: command.kind, name: command.title, code: command.code }) };
    }
    case 'update_effect': {
      const effect = s.project.effects[command.effectId];
      if (!effect) throw new Error(`Effect not found: ${command.effectId}`);
      const { saveEffect } = await import('../ui/customActions');
      saveEffect({ ...effect, name: command.title ?? effect.name, code: command.code ?? effect.code });
      return { ok: true };
    }
    case 'delete_effect': {
      const { deleteEffect } = await import('../ui/customActions');
      deleteEffect(command.effectId);
      return { ok: true };
    }
    case 'set_filter': {
      const { applyFilterEffect } = await import('../ui/customActions');
      applyFilterEffect(command.clipId, command.effectId, command.amount);
      return { ok: true };
    }
    case 'add_font': {
      const { addGoogleFont } = await import('../ui/customActions');
      return { family: await addGoogleFont(command.family) };
    }
    case 'set_speed': {
      const clip = requireClip(command.clipId);
      if (clip.type !== 'media') throw new Error('Speed only applies to media clips');
      const { setSpeed, setSpeedCurve } = await import('../ui/editActions');
      if (command.curve !== undefined) {
        const curve = command.curve === null ? null : SPEED_CURVES.find((c) => c.name === command.curve);
        if (curve === undefined) throw new Error(`Unknown speed curve: ${command.curve}`);
        setSpeedCurve(clip, curve);
      } else if (command.speed) {
        setSpeed(clip, Math.min(Math.max(command.speed, 0.25), 4));
      }
      return { ok: true };
    }
    case 'set_aspect':
      s.setAspect(command.aspect);
      return { ok: true };
    case 'set_background_blur':
      s.checkpoint();
      useEditor.setState((state) => ({ project: { ...state.project, backgroundBlur: command.enabled } }));
      return { ok: true };
    case 'seek':
      s.setPlaying(false);
      s.setTime(command.time);
      return { ok: true };
    case 'undo':
      s.undo();
      return { ok: true };
    case 'redo':
      s.redo();
      return { ok: true };
    case 'run_ai':
      return runAi(command.tool, command.options ?? {});
  }
}

async function runAi(tool: AiTool, options: Record<string, unknown>) {
  const ai = await import('../ui/aiActions');
  const clipId = String(options.clipId ?? '');
  const runs: Record<AiTool, () => Promise<string | null>> = {
    captions: () => ai.autoCaptions(String(options.model ?? 'onnx-community/whisper-base_timestamped'), String(options.language ?? 'turkish')),
    remove_silences: () => ai.removeSilences(Number(options.thresholdDb ?? -40), Number(options.minDuration ?? 0.6)),
    remove_fillers: () => ai.removeFillers([]),
    denoise: () => ai.denoise(clipId),
    split_scenes: () => ai.splitScenes(clipId),
    reframe: () => ai.smartReframe(clipId),
    enhance: () => ai.enhance(clipId),
    beats: () => ai.beatMarkers(clipId),
    translate: () => ai.translateCaptions(String(options.src ?? 'tr'), String(options.tgt ?? 'en'), options.bilingual !== false),
    speech: () => ai.generateSpeech(String(options.text ?? ''), String(options.voice ?? 'eng')),
  };
  const error = await runs[tool]();
  if (error) throw new Error(error);
  return summarize();
}
