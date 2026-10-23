import { useEditor } from '../core/store';
import { sourceSpan, splitClip, uid } from '../core/timeline';
import { averageSpeed } from '../core/speed';
import type { Clip, MediaClip, SpeedCurve } from '../core/types';
import { captureFrame, reverseClip } from '../media/clipOps';
import { parseCube } from '../media/lut';
import { clipSourceTime } from '../render/composeFrame';

const editor = () => useEditor.getState();

async function withTask(label: string, work: (report: (p: number) => void) => Promise<void>) {
  const s = editor();
  const id = s.startTask(label);
  try {
    await work((progress) => s.updateTask(id, { progress }));
    s.endTask(id);
  } catch (error) {
    s.updateTask(id, { error: (error as Error).message });
    setTimeout(() => s.endTask(id), 8000);
  }
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
