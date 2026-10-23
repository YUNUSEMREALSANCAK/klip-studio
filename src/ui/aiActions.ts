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

// Uzun süren bir işi görev kartıyla çalıştırır; hata olursa kartta gösterir ve hata mesajını döndürür.
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
  if (!clip || clip.type !== 'media') throw new Error('Önce bir video veya ses klibi seçin');
  return { clip, asset: editor().assets[clip.assetId] };
}

export const captionWords = (clips: Clip[]): Word[] =>
  sortedTrack<TextClip>(clips, 'text').flatMap((c) => c.words ?? []);

export function autoCaptions(model: string, language: string) {
  return runTask('Otomatik altyazı', async (report) => {
    const { project, assets } = editor();
    const { words, wordLevel } = await transcribeTimeline(project.clips, assets, { model, language }, report);
    if (!words.length) throw new Error('Konuşma bulunamadı');
    const captions = buildCaptions(words);
    // Önceki otomatik altyazıları yenileriyle değiştir.
    editor().mutate((clips) => [...clips.filter((c) => !(c.type === 'text' && c.words)), ...captions]);
    if (!wordLevel) report('Kelime zamanları yaklaşık hesaplandı', 1);
  });
}

export function removeSilences(thresholdDb: number, minDuration: number) {
  return runTask('Sessizlikleri kes', async (report) => {
    report('Ses analiz ediliyor', -1);
    const { project, assets } = editor();
    const ranges = await detectSilences(project.clips, assets, { thresholdDb, minDuration, padding: 0.08 });
    if (!ranges.length) throw new Error('Kesilecek sessizlik bulunamadı');
    editor().mutate((clips) => rippleDeleteRanges(clips, ranges));
  });
}

export function removeFillers(extra: string[]) {
  return runTask('Dolgu kelimelerini kes', async () => {
    const words = captionWords(editor().project.clips);
    if (!words.length) throw new Error('Önce otomatik altyazı oluşturun');
    const ranges = fillerRanges(words, [...FILLER_WORDS, ...extra]);
    if (!ranges.length) throw new Error('Dolgu kelimesi bulunamadı');
    editor().mutate((clips) => rippleDeleteRanges(clips, ranges));
  });
}

export function denoise(clipId: string) {
  return runTask('Gürültü azaltma', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (!asset.hasAudio) throw new Error('Bu klipte ses yok');
    const wav = await denoiseClip(clip, asset, (p) => report('RNNoise ile temizleniyor', p));
    const cleaned = await createAsset(wav, `${asset.name} (temiz ses).wav`);
    editor().addAsset(cleaned);
    const audioClip = { ...createMediaClip(cleaned, 'audio', clip.start), duration: clip.duration, speed: clip.speed };
    editor().mutate((clips) => [...clips.map((c) => (c.id === clip.id ? { ...c, muted: true } : c)), audioClip]);
  });
}

export function splitScenes(clipId: string) {
  return runTask('Sahne tespiti', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (asset.kind !== 'video') throw new Error('Sahne tespiti video klipte çalışır');
    const cuts = await detectScenes(asset, clip, (p) => report('Kareler karşılaştırılıyor', p));
    if (!cuts.length) throw new Error('Sahne geçişi bulunamadı');
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
  return runTask('Ritim tespiti', async (report) => {
    report('Vuruşlar aranıyor', -1);
    const { clip, asset } = mediaClip(clipId);
    const beats = await detectBeats(clip, asset);
    if (!beats.length) throw new Error('Belirgin vuruş bulunamadı');
    editor().setMarkers(beats);
  });
}

export function smartReframe(clipId: string) {
  return runTask('Akıllı çerçeveleme', async (report) => {
    const { clip, asset } = mediaClip(clipId);
    if (asset.kind !== 'video') throw new Error('Akıllı çerçeveleme video klipte çalışır');
    const reframe = await computeReframe(asset, clip, (p) => report('Yüzler takip ediliyor', p));
    if (editor().project.aspect === '16:9') editor().setAspect('9:16');
    editor().updateClip(clip.id, { reframe } as Partial<MediaClip>);
  });
}

export function enhance(clipId: string) {
  return runTask('Otomatik iyileştir', async () => {
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
  link.download = 'altyazi.srt';
  link.click();
}

// Metin izindeki altyazıları çevirir. İki dilli modda çeviri, orijinalin üstüne ikinci satır olarak eklenir.
export function translateCaptions(src: string, tgt: string, bilingual: boolean) {
  return runTask('Altyazı çevirisi', async (report) => {
    const captions = sortedTrack<TextClip>(editor().project.clips, 'text');
    if (!captions.length) throw new Error('Çevrilecek metin yok; önce altyazı oluşturun');
    if (src === tgt) throw new Error('Kaynak ve hedef dil aynı');
    const translated = await translateTexts(captions.map((c) => c.text), src, tgt, report);
    const byId = new Map(captions.map((c, i) => [c.id, translated[i]]));
    editor().mutate((clips) => {
      if (!bilingual) {
        return clips.map((c) =>
          c.type === 'text' && byId.has(c.id)
            ? { ...c, text: byId.get(c.id)!, words: undefined, preset: c.preset === 'karaoke' ? 'classic' : c.preset }
            : c,
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

// Metni yerel bir TTS modeliyle seslendirir ve oynatma çizgisine ses klibi olarak ekler.
export function generateSpeech(text: string, voice: string) {
  return runTask('Seslendirme', async (report) => {
    if (!text.trim()) throw new Error('Seslendirilecek metni yazın');
    const { audio, sampleRate } = await synthesize(text, voice, report);
    const asset = await createAsset(encodeWav(audio, sampleRate), `Seslendirme: ${text.slice(0, 24)}.wav`);
    editor().addAsset(asset);
    const clip = createMediaClip(asset, 'audio', editor().time);
    editor().mutate((clips) => [...clips, clip]);
  });
}
