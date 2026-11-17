import { useEditor } from '../core/store';
import { clipEnd, createMediaClip, projectDuration, sourceSpan, splitClip, uid } from '../core/timeline';
import { layoutFor, markersInside, motionKeyframes, type LayoutPreset, type MotionPreset } from '../core/presets';
import { averageSpeed } from '../core/speed';
import { ASPECT_SIZES, DEFAULT_TRANSFORM, type Clip, type MediaClip, type SpeedCurve, type Transform } from '../core/types';
import { captureFrame, reverseClip } from '../media/clipOps';
import { createAsset } from '../media/importMedia';
import { planAutoSfx, type AutoSfxOptions } from '../media/autoSfx';
import { fetchSound, findSound, loadSoundLibrary } from '../media/soundEffects';
import { renderSticker } from '../media/stickers';
import { decodeAssetAudio } from '../media/audio';
import { integratedLoudness } from '../media/loudness';
import { changeVoice, VOICE_PRESETS, type VoicePreset } from '../media/voice';
import { parseCube } from '../media/lut';
import { clipSourceTime } from '../render/composeFrame';

const editor = () => useEditor.getState();

// Runs a job with a task card. Returns the error message on failure (also shown on the card), otherwise null.
async function withTask(label: string, work: (report: (p: number) => void) => Promise<void>): Promise<string | null> {
  const s = editor();
  const id = s.startTask(label);
  try {
    await work((progress) => s.updateTask(id, { progress }));
    s.endTask(id);
    return null;
  } catch (error) {
    const message = (error as Error).message;
    s.updateTask(id, { error: message });
    setTimeout(() => s.endTask(id), 8000);
    return message;
  }
}

// Renders the clip's voice through an effect into a new audio clip and mutes the original, like noise reduction does.
export function voiceEffect(clip: MediaClip, preset: VoicePreset) {
  return withTask('Voice effect', async () => {
    const asset = editor().assets[clip.assetId];
    if (!asset?.hasAudio) throw new Error('This clip has no audio');
    const label = VOICE_PRESETS.find((p) => p.id === preset)?.label;
    if (!label) throw new Error(`Unknown voice effect: ${preset}`);
    const processed = await createAsset(await changeVoice(clip, asset, preset), `${asset.name} (${label.toLowerCase()} voice).wav`);
    editor().addAsset(processed);
    const voiced = { ...createMediaClip(processed, 'audio', clip.start), duration: clip.duration, speed: clip.speed };
    editor().mutate((clips) => [...clips.map((c) => (c.id === clip.id ? { ...c, muted: true } : c)), voiced]);
  });
}

// Adds a recorded sound effect on the audio track at the given time (default: the playhead).
// `id` is a one-click pick ("whoosh") or a library id ("whoosh/whoosh_60013"); a sound already imported is reused.
export async function addSoundEffect(id: string, start = editor().time, volume = 1): Promise<string> {
  const clip = await soundClip(id, start, volume);
  editor().mutate((clips) => [...clips, clip]);
  return clip.id;
}

async function soundClip(id: string, start: number, volume: number): Promise<MediaClip> {
  const sound = await findSound(id);
  const name = `${sound.name}.mp3`;
  let asset = Object.values(editor().assets).find((a) => a.kind === 'audio' && a.name === name);
  if (!asset) {
    asset = await createAsset(await fetchSound(sound), name);
    editor().addAsset(asset);
  }
  const clip = { ...createMediaClip(asset, 'audio', Math.max(0, start)), volume };
  if (sound.category !== 'music') return clip;
  // Music is a bed: it ends with the video, fades in and out and dips under speech.
  const end = projectDuration(editor().project.clips);
  const duration = end > clip.start + 1 ? Math.min(clip.duration, end - clip.start) : clip.duration;
  return { ...clip, duration, volume: volume * 0.7, duck: true, fadeIn: Math.min(1, duration / 4), fadeOut: Math.min(2, duration / 4) };
}

// Automatic sound design: soft whooshes on the main track's cuts and ticks on texts, all ducked under speech.
// One undo step removes them all. Returns how many sounds were placed.
export async function autoSoundDesign(options: AutoSfxOptions = {}): Promise<number> {
  const plan = planAutoSfx(editor().project.clips, await loadSoundLibrary(), options);
  const added: MediaClip[] = [];
  for (const p of plan) added.push({ ...(await soundClip(p.sound, p.start, p.volume)), duck: true });
  if (added.length) editor().mutate((clips) => [...clips, ...added]);
  return added.length;
}

// Changes speed; the clip's source range stays fixed, duration and keyframes are scaled.
export function setSpeed(clip: MediaClip, speed: number) {
  const asset = editor().assets[clip.assetId];
  const maxDuration = asset.kind === 'image' ? Infinity : (asset.duration - clip.in) / speed;
  const duration = Math.min(sourceSpan(clip) / speed, maxDuration);
  const scale = duration / clip.duration;
  editor().updateClip(clip.id, {
    speed,
    duration,
    speedCurve: undefined,
    keyframes: clip.keyframes.map((k) => ({ ...k, time: k.time * scale })),
  } as Partial<MediaClip>);
}

// Applies a speed curve (null = remove). The source range stays fixed; duration follows the curve's average.
export function setSpeedCurve(clip: MediaClip, curve: SpeedCurve | null) {
  if (!curve) {
    editor().updateClip(clip.id, { speedCurve: undefined } as Partial<MediaClip>);
    return;
  }
  const average = averageSpeed(curve);
  const asset = editor().assets[clip.assetId];
  const span = Math.min(sourceSpan(clip), asset.duration - clip.in);
  const duration = span / average;
  const scale = duration / clip.duration;
  editor().updateClip(clip.id, {
    speed: average,
    duration,
    speedCurve: curve,
    keyframes: clip.keyframes.map((k) => ({ ...k, time: k.time * scale })),
  } as Partial<MediaClip>);
}

// Inserts the frame at the playhead as a 2 s still image.
export function freezeFrame(clip: MediaClip) {
  return withTask('Freezing frame', async () => {
    const { time, assets } = editor();
    const asset = assets[clip.assetId];
    if (asset.kind !== 'video') throw new Error('Freeze frame works on video clips');
    const at = Math.min(Math.max(time, clip.start), clip.start + clip.duration - 0.05);
    const still = await captureFrame(asset, clipSourceTime(clip, at, assets));
    editor().addAsset(still);
    editor().mutate((clips) => {
      const pieces: Clip[] = splitClip(clip, at) ?? [clip];
      const frozen: MediaClip = {
        ...clip,
        id: uid(),
        assetId: still.id,
        start: at - 1e-4,
        in: 0,
        duration: 2,
        speed: 1,
        keyframes: [],
        transition: undefined,
        reframe: undefined,
      };
      return [...clips.filter((c) => c.id !== clip.id), ...pieces, frozen];
    });
  });
}

export function reverse(clip: MediaClip) {
  return withTask('Reversing clip', async (report) => {
    const asset = editor().assets[clip.assetId];
    if (asset.kind !== 'video') throw new Error('Reverse works on video clips');
    const reversed = await reverseClip(clip, asset, report);
    editor().addAsset(reversed);
    editor().updateClip(clip.id, { assetId: reversed.id, in: 0, reframe: undefined } as Partial<MediaClip>);
  });
}

export async function importLut(file: File, applyTo?: MediaClip) {
  const s = editor();
  try {
    const lut = parseCube(await file.text(), file.name);
    s.checkpoint();
    useEditor.setState((state) => ({ project: { ...state.project, luts: { ...state.project.luts, [lut.id]: lut } } }));
    if (applyTo) s.updateClip(applyTo.id, { filter: { ...applyTo.filter, lutId: lut.id, lutIntensity: 1 } } as Partial<MediaClip>, false);
  } catch (error) {
    const id = s.startTask('Could not import LUT');
    s.updateTask(id, { error: (error as Error).message });
    setTimeout(() => s.endTask(id), 6000);
  }
}

// Adds an emoji sticker as an overlay (3 s, popping in) at the given time; the same emoji reuses its image.
export async function addSticker(emoji: string, start = editor().time, place: Partial<Transform> = {}): Promise<string> {
  const name = `Sticker ${emoji}.png`;
  let asset = Object.values(editor().assets).find((a) => a.kind === 'image' && a.name === name);
  if (!asset) {
    asset = await createAsset(await renderSticker(emoji), name);
    editor().addAsset(asset);
  }
  const clip: MediaClip = {
    ...createMediaClip(asset, 'overlay', Math.max(0, start)),
    duration: 3,
    transform: { ...DEFAULT_TRANSFORM, y: 0.35, scale: 0.28, ...place },
    animIn: { type: 'zoom', duration: 0.25 },
    animOut: { type: 'fade', duration: 0.2 },
  };
  editor().mutate((clips) => [...clips, clip]);
  editor().select(clip.id);
  return clip.id;
}

// Ken Burns style motion over the whole clip (keyframes on position and size).
export function applyMotion(clip: MediaClip, preset: MotionPreset) {
  editor().updateClip(clip.id, { keyframes: motionKeyframes(clip, preset) } as Partial<MediaClip>);
}

// Places an overlay in a layout: full screen, a half (split screen, cropped to fill) or a corner window.
export function applyLayout(clip: MediaClip, preset: LayoutPreset) {
  const asset = editor().assets[clip.assetId];
  if (clip.track !== 'overlay') throw new Error('Layouts apply to overlay clips');
  const { width, height } = ASPECT_SIZES[editor().project.aspect];
  const { transform, crop } = layoutFor(preset, asset.width, asset.height, width, height);
  const keyframes = clip.keyframes.filter((k) => k.prop !== 'x' && k.prop !== 'y' && k.prop !== 'scale');
  editor().updateClip(clip.id, { transform: { ...transform, rotation: clip.transform.rotation }, crop, keyframes } as Partial<MediaClip>);
}

// Moves a video's sound to its own clip on the audio track (same timing and speed) and mutes the video.
export function extractAudio(clip: MediaClip): string {
  const asset = editor().assets[clip.assetId];
  if (asset.kind !== 'video' || !asset.hasAudio) throw new Error('This clip has no audio');
  const audio: MediaClip = {
    ...createMediaClip(asset, 'audio', clip.start),
    in: clip.in,
    duration: clip.duration,
    speed: clip.speed,
    speedCurve: clip.speedCurve,
    volume: clip.volume,
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
    duck: clip.duck,
    keyframes: clip.keyframes.filter((k) => k.prop === 'volume'),
  };
  editor().mutate((clips) => [...clips.map((c) => (c.id === clip.id ? { ...c, muted: true } : c)), audio]);
  return audio.id;
}

// Sets the clip's volume so its loudness reaches the target (-16 LUFS: speech that sits well in a -14 mix).
export async function normalizeVolume(clip: MediaClip, target = -16): Promise<number> {
  const asset = editor().assets[clip.assetId];
  if (!asset?.hasAudio) throw new Error('This clip has no audio');
  const buffer = await decodeAssetAudio(asset);
  const from = Math.floor(clip.in * buffer.sampleRate);
  const to = Math.min(buffer.length, Math.ceil((clip.in + sourceSpan(clip)) * buffer.sampleRate));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, ch) => buffer.getChannelData(ch).subarray(from, to));
  const loudness = integratedLoudness(channels, buffer.sampleRate);
  if (!Number.isFinite(loudness)) throw new Error('This clip is silent');
  const volume = Math.min(2, Math.max(0.05, Math.pow(10, (target - loudness) / 20)));
  editor().updateClip(clip.id, { volume, keyframes: clip.keyframes.filter((k) => k.prop !== 'volume') } as Partial<MediaClip>);
  return volume;
}

// The same with a task card for the UI (errors such as a silent clip show on the card).
export const normalizeVolumeWithTask = (clip: MediaClip) =>
  withTask('Normalize loudness', async () => {
    await normalizeVolume(clip);
  });

// A copy right after the clip (on the main track it's inserted after it; elsewhere it follows on a free lane).
export function duplicateClip(clip: Clip): string {
  const copy = { ...structuredClone(clip), id: uid(), start: clip.track === 'main' ? clip.start + 1e-3 : clipEnd(clip) } as Clip;
  editor().mutate((clips) => [...clips, copy]);
  editor().select(copy.id);
  return copy.id;
}

let clipboard: Clip | null = null;

export function copyClip(clip: Clip) {
  clipboard = structuredClone(clip);
}

// Pastes the copied clip at the playhead (on the main track it goes right after the clip under the playhead).
export function pasteClip(): string | null {
  if (!clipboard) return null;
  const copy = { ...structuredClone(clipboard), id: uid(), start: editor().time } as Clip;
  editor().mutate((clips) => [...clips, copy]);
  editor().select(copy.id);
  return copy.id;
}

// Cuts clips at every marker (e.g. the beats found by the AI): the given clip, or all main-track clips.
export function splitAtMarkers(clipId?: string): number {
  const { project } = editor();
  const targets = new Set(project.clips.filter((c) => (clipId ? c.id === clipId : c.track === 'main')).map((c) => c.id));
  let cuts = 0;
  editor().mutate((clips) =>
    clips.flatMap((clip) => {
      if (!targets.has(clip.id)) return [clip];
      const pieces: Clip[] = [];
      let rest: Clip = clip;
      for (const time of markersInside(clip, project.markers)) {
        const split = splitClip(rest, time);
        if (!split) continue;
        pieces.push(split[0]);
        rest = split[1];
        cuts++;
      }
      return [...pieces, rest];
    }),
  );
  return cuts;
}
