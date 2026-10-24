import { useEditor } from '../core/store';
import { createMediaClip, sourceSpan, splitClip, uid } from '../core/timeline';
import { averageSpeed } from '../core/speed';
import type { Clip, MediaClip, SpeedCurve } from '../core/types';
import { captureFrame, reverseClip } from '../media/clipOps';
import { createAsset } from '../media/importMedia';
import { SOUND_EFFECTS, synthesizeSoundEffect, type SoundEffect } from '../media/soundEffects';
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

// Adds a synthesized sound effect on the audio track at the given time (default: the playhead).
export async function addSoundEffect(id: SoundEffect, start = editor().time): Promise<string> {
  const effect = SOUND_EFFECTS.find((s) => s.id === id);
  if (!effect) throw new Error(`Unknown sound effect: ${id}`);
  const asset = await createAsset(await synthesizeSoundEffect(id), `${effect.label}.wav`);
  editor().addAsset(asset);
  const clip = createMediaClip(asset, 'audio', start);
  editor().mutate((clips) => [...clips, clip]);
  return clip.id;
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
