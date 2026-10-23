import { denoiseClip, detectBeats, detectSilences, fillerRanges, FILLER_WORDS } from '../ai/audioTools';
import { synthesize, translateTexts } from '../ai/models';
import { toSrt, transcribeTimeline } from '../ai/transcribe';
import { autoEnhance, computeReframe, detectScenes } from '../ai/videoTools';
import { useEditor } from '../core/store';
import { buildCaptions, createMediaClip, rippleDeleteRanges, sortedTrack, splitClip, uid } from '../core/timeline';
import type { Clip, MediaClip, TextClip, Word } from '../core/types';
import { encodeWav } from '../media/audio';
import { createAsset } from '../media/importMedia';

type Report = (message: string, progress: number) => void;

const editor = () => useEditor.getState();

// Runs a long job with a task card; on failure shows it on the card and returns the error message.
async function runTask(label: string, work: (report: Report) => Promise<void>): Promise<string | null> {
  const id = editor().startTask(label);
  try {
    await work((message, progress) => editor().updateTask(id, { message, progress }));
    editor().endTask(id);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    editor().updateTask(id, { error: message });
    setTimeout(() => editor().endTask(id), 8000);
    return message;
  }
}

function mediaClip(id: string) {
  const clip = editor().project.clips.find((c) => c.id === id);
  if (!clip || clip.type !== 'media') throw new Error('Select a video or audio clip first');
  return { clip, asset: editor().assets[clip.assetId] };
}

export const captionWords = (clips: Clip[]): Word[] => sortedTrack<TextClip>(clips, 'text').flatMap((c) => c.words ?? []);

export function autoCaptions(model: string, language: string) {
  return runTask('Auto captions', async (report) => {
    const { project, assets } = editor();
    const { words, wordLevel } = await transcribeTimeline(project.clips, assets, { model, language }, report);
    if (!words.length) throw new Error('No speech found');
    const captions = buildCaptions(words);
    // Replace previous auto captions with the new ones.
    editor().mutate((clips) => [...clips.filter((c) => !(c.type === 'text' && c.words)), ...captions]);
    if (!wordLevel) report('Word timings were estimated', 1);
  });
}

export function removeSilences(thresholdDb: number, minDuration: number) {
  return runTask('Cut silences', async (report) => {
    report('Analyzing audio', -1);
    const { project, assets } = editor();
    const ranges = await detectSilences(project.clips, assets, { thresholdDb, minDuration, padding: 0.08 });
    if (!ranges.length) throw new Error('No silence to cut');
    editor().mutate((clips) => rippleDeleteRanges(clips, ranges));
  });
}

export function removeFillers(extra: string[]) {
  return runTask('Cut filler words', async () => {
    const words = captionWords(editor().project.clips);
    if (!words.length) throw new Error('Generate auto captions first');
    const ranges = fillerRanges(words, [...FILLER_WORDS, ...extra]);
    if (!ranges.length) throw new Error('No filler words found');
    editor().mutate((clips) => rippleDeleteRanges(clips, ranges));
  });
}

export function denoise(clipId: string) {
  return runTask('Noise reduction', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (!asset.hasAudio) throw new Error('This clip has no audio');
    const wav = await denoiseClip(clip, asset, (p) => report('Cleaning with RNNoise', p));
    const cleaned = await createAsset(wav, `${asset.name} (clean audio).wav`);
    editor().addAsset(cleaned);
    const audioClip = { ...createMediaClip(cleaned, 'audio', clip.start), duration: clip.duration, speed: clip.speed };
    editor().mutate((clips) => [...clips.map((c) => (c.id === clip.id ? { ...c, muted: true } : c)), audioClip]);
  });
}

export function splitScenes(clipId: string) {
  return runTask('Scene detection', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (asset.kind !== 'video') throw new Error('Scene detection works on video clips');
    const cuts = await detectScenes(asset, clip, (p) => report('Comparing frames', p));
    if (!cuts.length) throw new Error('No scene changes found');
    editor().mutate((clips) => {
      let pieces: Clip[] = [clips.find((c) => c.id === clip.id)!];
      for (const cut of cuts) {
        pieces = pieces.flatMap((piece) => splitClip(piece, cut) ?? [piece]);
      }
      return [...clips.filter((c) => c.id !== clip.id), ...pieces];
    });
  });
}

export function beatMarkers(clipId: string) {
  return runTask('Beat detection', async (report) => {
    report('Looking for beats', -1);
    const { clip, asset } = mediaClip(clipId);
    const beats = await detectBeats(clip, asset);
    if (!beats.length) throw new Error('No clear beats found');
    editor().setMarkers(beats);
  });
}

export function smartReframe(clipId: string) {
  return runTask('Smart reframe', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (asset.kind !== 'video') throw new Error('Smart reframe works on video clips');
    const reframe = await computeReframe(asset, clip, (p) => report('Tracking faces', p));
    if (editor().project.aspect === '16:9') editor().setAspect('9:16');
    editor().updateClip(clip.id, { reframe } as Partial<MediaClip>);
  });
}

export function enhance(clipId: string) {
  return runTask('Auto enhance', async () => {
    const { clip, asset } = mediaClip(clipId);
    const patch = await autoEnhance(asset, clip);
    editor().updateClip(clip.id, { filter: { ...clip.filter, ...patch } } as Partial<MediaClip>);
  });
}

export function downloadSrt() {
  const captions = sortedTrack<TextClip>(editor().project.clips, 'text');
  if (!captions.length) return;
  const blob = new Blob([toSrt(captions)], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'captions.srt';
  link.click();
}

// Translates the captions on the text track. In bilingual mode the translation is added as a second line above the original.
export function translateCaptions(src: string, tgt: string, bilingual: boolean) {
  return runTask('Caption translation', async (report) => {
    const captions = sortedTrack<TextClip>(editor().project.clips, 'text');
    if (!captions.length) throw new Error('No text to translate; generate captions first');
    if (src === tgt) throw new Error('Source and target language are the same');
    const translated = await translateTexts(
      captions.map((c) => c.text),
      src,
      tgt,
      report,
    );
    const byId = new Map(captions.map((c, i) => [c.id, translated[i]]));
    editor().mutate((clips) => {
      if (!bilingual) {
        return clips.map((c) =>
          c.type === 'text' && byId.has(c.id) ? { ...c, text: byId.get(c.id)!, words: undefined, preset: c.preset === 'karaoke' ? 'classic' : c.preset } : c,
        );
      }
      const copies = captions.map((c) => ({
        ...c,
        id: uid(),
        text: byId.get(c.id)!,
        words: undefined,
        preset: 'box' as const,
        fontSize: c.fontSize * 0.75,
        y: Math.max(0.05, c.y - c.fontSize * 1.6),
      }));
      return [...clips, ...copies];
    });
  });
}

// Voices text with a local TTS model and adds it as an audio clip at the playhead.
export function generateSpeech(text: string, voice: string) {
  return runTask('Voiceover', async (report) => {
    if (!text.trim()) throw new Error('Type the text to speak');
    const { audio, sampleRate } = await synthesize(text, voice, report);
    const asset = await createAsset(encodeWav(audio, sampleRate), `Voiceover: ${text.slice(0, 24)}.wav`);
    editor().addAsset(asset);
    const clip = createMediaClip(asset, 'audio', editor().time);
    editor().mutate((clips) => [...clips, clip]);
  });
}
