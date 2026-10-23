import { useEditor } from '../core/store';
import { sourceSpan, splitClip, uid } from '../core/timeline';
import type { Clip, MediaClip } from '../core/types';
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

// Hızı değiştirir; klibin kaynakta kapladığı aralık sabit kalır, süre ve anahtar kareler ölçeklenir.
export function setSpeed(clip: MediaClip, speed: number) {
  const asset = editor().assets[clip.assetId];
  const maxDuration = asset.kind === 'image' ? Infinity : (asset.duration - clip.in) / speed;
  const duration = Math.min(sourceSpan(clip) / speed, maxDuration);
  const scale = duration / clip.duration;
  editor().updateClip(clip.id, {
    speed,
    duration,
    keyframes: clip.keyframes.map((k) => ({ ...k, time: k.time * scale })),
  } as Partial<MediaClip>);
}

// Oynatma çizgisindeki kareyi 2 sn'lik bir görsel olarak araya ekler.
export function freezeFrame(clip: MediaClip) {
  return withTask('Kare donduruluyor', async () => {
    const { time, assets } = editor();
    const asset = assets[clip.assetId];
    if (asset.kind !== 'video') throw new Error('Kare dondurma video klipte çalışır');
    const at = Math.min(Math.max(time, clip.start), clip.start + clip.duration - 0.05);
    const still = await captureFrame(asset, clipSourceTime(clip, at, assets));
    editor().addAsset(still);
    editor().mutate((clips) => {
      const pieces: Clip[] = splitClip(clip, at) ?? [clip];
      const frozen: MediaClip = { ...clip, id: uid(), assetId: still.id, start: at - 1e-4, in: 0, duration: 2, speed: 1, keyframes: [], transition: undefined, reframe: undefined };
      return [...clips.filter((c) => c.id !== clip.id), ...pieces, frozen];
    });
  });
}

export function reverse(clip: MediaClip) {
  return withTask('Klip ters çevriliyor', async (report) => {
    const asset = editor().assets[clip.assetId];
    if (asset.kind !== 'video') throw new Error('Ters çevirme video klipte çalışır');
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
    const id = s.startTask('LUT içe aktarılamadı');
    s.updateTask(id, { error: (error as Error).message });
    setTimeout(() => s.endTask(id), 6000);
  }
}
