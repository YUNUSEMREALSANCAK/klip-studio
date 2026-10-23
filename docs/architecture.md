# Mimari

Klip Stüdyo tek sayfalık bir React uygulamasıdır; sunucu tarafı yoktur. Ajanlar için ayrı bir MCP sunucusu (`mcp/server.mjs`) isteğe bağlı olarak çalıştırılır.

## Veri modeli (`src/core/types.ts`)

```
Project
  aspect, fps, background, backgroundBlur, markers, luts
  clips: Clip[]
    MediaClip  track: main | overlay | audio
               assetId, start, in, duration, speed, volume, opacity, transform {x, y, scale, rotation},
               keyframes[], filter (+ lutId), mask, chroma, transition, fadeIn/fadeOut, duck, removeBackground, reframe
    TextClip   track: text → text, preset, animation, font, color, words (karaoke zamanları)
Asset (proje dışında): file, url, duration, width, height, hasAudio, thumbnail
```

- **Ana iz manyetiktir:** `packMainTrack` klipleri boşluksuz dizer.
- **Geçiş**, giren klibin `transition` alanında tutulur ve kesim noktasının iki yanına yayılır.
- **Hız:** kaynak zamanı = `in + (t − start) × speed`. Bölme, kırpma ve ripple silme bunu hesaba katar.
- **Anahtar kareler** klibin başına göre saniyedir; `core/animation.ts` o anki değeri yumuşak geçişle hesaplar.
- **Migrasyon:** `core/migrate.ts`, eski projelere yeni alanların varsayılanlarını ekler.

## Kare hattı

```
               ┌────────────── önizleme ──────────────┐
zaman (t) ──▶  │ PreviewEngine: <video> havuzu + senkron │──▶ composeFrame ──▶ Compositor (WebGL2) ──▶ ekran
               └───────────────────────────────────────┘          │
               ┌─────────────── dışa aktarma ──────────┐          └──▶ drawTexts (Canvas 2D)
zaman (t) ──▶  │ FrameReader: Mediabunny CanvasSink    │──▶ composeFrame ──▶ CanvasSource ──▶ MP4
               └───────────────────────────────────────┘
```

- `render/composeFrame.ts`: görünen klipleri bulur (geçişte iki ana klip), anahtar karelerle animasyonlu durumu, bulanık tuvali, maskeyi, LUT'u ve kare harmanlamayı uygular.
- `render/compositor.ts` + `render/shaders.ts`: katman shader'ı (renk, bulanıklık, LUT, keskinlik, vinyet, arka plan maskesi, şekil maskesi, chroma key) ve 12 geçiş shader'ı; döndürme çizim dörtgeninde yapılır.
- `render/layout.ts`: katman dikdörtgenleri; önizlemedeki seçim kutusu (`ui/StageEditor.tsx`) da bunu kullanır.

## Ses hattı

- **Önizleme:** her klip bir `<video>` öğesiyle çalınır; `playbackRate` = hız (`preservesPitch`), ses düzeyi = anahtar kare × fade × kısma zarfı.
- **Dışa aktarma ve analiz:** `media/audio.ts` `mixTimelineAudio`, klipleri `OfflineAudioContext`'te karıştırır; hız için `media/timeStretch.ts` (WSOLA), ses düzeyi için eğri, müzik kısma için `media/ducking.ts` zarfı.

## Yapay zeka (`src/ai/`)

| Modül | Çalıştığı yer | Not |
| --- | --- | --- |
| `whisper.worker.ts` | Web Worker | transformers.js; WebGPU varsa GPU, yoksa WASM |
| `sam.worker.ts` | Web Worker | SlimSAM; görsel gömmesi bir kez, her tıklamada yalnız kod çözücü; video için tek istekte gömme + maske |
| `models.worker.ts` | Web Worker | çeviri (opus-mt / NLLB), seslendirme (MMS-TTS), ön plan ayırma (BiRefNet / MODNet) |
| `videoInpaint.ts` | ana iş parçacığı | nesneyi örnek karelerde SAM ile takip eder, her kareyi doldurur, yeni video kodlar |
| `vision.ts` | ana iş parçacığı | MediaPipe; önizlemede gerçek zamanlı kişi maskesi, yüz algılama |
| `audioTools.ts` · `videoTools.ts` · `objectTools.ts` | ana iş parçacığı | RNNoise, sessizlik/ritim; sahne, çerçeveleme, iyileştirme; push-pull doldurma |

## Ajanlar (`src/core/commands.ts`, `src/agent/`)

```
Arayüz ─┐
window.klip ─┤
MCP sunucusu ⇄ WebSocket :5299 ⇄ bridge.ts ─┼──▶ execute(Command) ──▶ store (geri alınabilir)
Asistan (Claude Opus 5.5, araç döngüsü) ─┘
```

- `COMMAND_SPECS` hem Claude araçlarının hem MCP'nin şemasıdır.
- `agent/assistant.ts`: elle yazılmış araç döngüsü, sunucu tarafı yedek model (`fallbacks: "default"`), geçmiş yalnız sona eklenir.

## Durum, kayıt ve dil

- `core/store.ts` (Zustand): proje, varlıklar, seçim, zaman, oynatma, geçmiş (geri al/yinele), görev kartları.
- `core/persistence.ts` + `ui/useAutosave.ts`: IndexedDB'ye otomatik kayıt, `.klip` zip arşivi.
- `i18n/`: `tr('Türkçe metin')` seçili dile çevirir; anahtar Türkçe metindir, İngilizcesi `i18n/en.ts`'te.
- `public/sw.js`: PWA önbelleği (sayfalar önce ağdan, dosyalar önce önbellekten).
