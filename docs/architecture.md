# Mimari

Klip Stüdyo tek sayfalık bir React uygulamasıdır; sunucu tarafı yoktur.

## Veri modeli

```
Project
  aspect, fps, background, markers
  clips: Clip[]
    MediaClip  track: main | overlay | audio   → assetId, start, in, duration, filter, transition, transform
    TextClip   track: text                     → text, preset, animation, words (karaoke zamanları)
Asset (proje dışında, bellekte): file, url, duration, width, height, hasAudio
```

- **Ana iz manyetiktir:** `packMainTrack` klipleri boşluksuz dizer.
- **Geçiş**, giren klibin `transition` alanında tutulur ve kesim noktasının iki yanına yayılır.

## Kare hattı

```
               ┌────────────── önizleme ──────────────┐
zaman (t) ──▶  │ PreviewEngine: <video> havuzu + senkron │──▶ composeFrame ──▶ Compositor (WebGL2) ──▶ ekran
               └───────────────────────────────────────┘          │
               ┌─────────────── dışa aktarma ──────────┐          └──▶ drawTexts (Canvas 2D)
zaman (t) ──▶  │ FrameReader: Mediabunny CanvasSink    │──▶ composeFrame ──▶ CanvasSource ──▶ MP4
               └───────────────────────────────────────┘
```

- `render/composeFrame.ts`: o anda görünen klipleri bulur (geçişte iki ana klip), her birini katman olarak çizer.
- `render/compositor.ts`: katman shader'ı (renk, keskinlik, vinyet, maske) ve geçiş shader'ı.
- `render/layout.ts`: katman dikdörtgenleri; önizleme seçim kutusu da bunu kullanır.

## Yapay zeka

| Modül | Çalıştığı yer | Not |
| --- | --- | --- |
| `ai/whisper.worker.ts` | Web Worker | transformers.js, WebGPU varsa GPU, yoksa WASM |
| `ai/sam.worker.ts` | Web Worker | SlimSAM; görsel gömmesi bir kez, her tıklamada yalnızca kod çözücü |
| `ai/vision.ts` | ana iş parçacığı | MediaPipe; önizlemede gerçek zamanlı maske |
| `ai/audioTools.ts` | ana iş parçacığı | RNNoise (tembel yüklenir), sessizlik ve ritim analizi |
| `ai/videoTools.ts` | ana iş parçacığı | sahne tespiti, yüz takibi, otomatik iyileştirme |
| `ai/objectTools.ts` | ana iş parçacığı | push-pull doldurma, kesip çıkarma |

## Durum

`core/store.ts` (Zustand): proje, varlıklar, seçim, zaman, oynatma, geçmiş (geri al/yinele) ve görev kartları.
