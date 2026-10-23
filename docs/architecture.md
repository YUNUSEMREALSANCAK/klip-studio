# Architecture

Klip Studio is a single-page React app with no server side. A separate MCP server for agents (`mcp/server.mjs`) can be run optionally.

## Data model (`src/core/types.ts`)

```
Project
  aspect, fps, background, backgroundBlur, markers, luts
  clips: Clip[]
    MediaClip  track: main | overlay | audio
               assetId, start, in, duration, speed, volume, opacity, transform {x, y, scale, rotation},
               keyframes[], filter (+ lutId), mask, chroma, transition, fadeIn/fadeOut, duck, removeBackground, reframe
    TextClip   track: text → text, preset, animation, font, color, words (karaoke timings)
Asset (outside the project): file, url, duration, width, height, hasAudio, thumbnail
```

- **The main track is magnetic:** `packMainTrack` lays clips out without gaps.
- A **transition** is stored on the incoming clip's `transition` field and spans both sides of the cut.
- **Speed:** source time = `in + (t − start) × speed`. Split, trim and ripple delete account for it.
- **Keyframes** are in seconds from the clip start; `core/animation.ts` computes the current value with easing.
- **Migration:** `core/migrate.ts` adds defaults for new fields to older projects.

## Frame pipeline

```
               ┌─────────────── preview ───────────────┐
time (t) ──▶   │ PreviewEngine: <video> pool + sync    │──▶ composeFrame ──▶ Compositor (WebGL2) ──▶ screen
               └───────────────────────────────────────┘          │
               ┌─────────────── export ────────────────┐          └──▶ drawTexts (Canvas 2D)
time (t) ──▶   │ FrameReader: Mediabunny CanvasSink    │──▶ composeFrame ──▶ CanvasSource ──▶ MP4
               └───────────────────────────────────────┘
```

- `render/composeFrame.ts`: finds the visible clips (two main clips during a transition) and applies the keyframed state, blurred canvas, masks, LUTs and frame blending.
- `render/compositor.ts` + `render/shaders.ts`: the layer shader (color, blur, LUT, sharpen, vignette, background matte, shape mask, chroma key) and 12 transition shaders; rotation happens in the draw quad.
- `render/layout.ts`: layer rectangles; the preview selection box (`ui/StageEditor.tsx`) uses them too.

## Audio pipeline

- **Preview:** each clip plays through a `<video>` element; `playbackRate` = speed (`preservesPitch`), volume = keyframe × fade × ducking envelope.
- **Export and analysis:** `mixTimelineAudio` in `media/audio.ts` mixes clips in an `OfflineAudioContext`, using `media/timeStretch.ts` (WSOLA) for speed, an envelope for volume, and the `media/ducking.ts` envelope for ducking.

## AI (`src/ai/`)

| Module | Runs on | Notes |
| --- | --- | --- |
| `whisper.worker.ts` | Web Worker | transformers.js; GPU with WebGPU, otherwise WASM |
| `sam.worker.ts` | Web Worker | SlimSAM; image embedding once, only the decoder per click; embedding + mask in one request for video |
| `models.worker.ts` | Web Worker | translation (opus-mt / NLLB), text to speech (MMS-TTS), foreground segmentation (BiRefNet / MODNet) |
| `lama.worker.ts` · `rife.worker.ts` | Web Worker | onnxruntime-web; LaMa inpainting, RIFE frame interpolation; WebGPU with a CPU retry |
| `matte.worker.ts` | Web Worker | export-time person segmentation (MediaPipe) |
| `videoInpaint.ts` | main thread | tracks the object with SAM on sample frames, fills every frame, encodes a new video |
| `vision.ts` | main thread | MediaPipe; real-time person matte in the preview, face detection |
| `audioTools.ts` · `videoTools.ts` · `objectTools.ts` | main thread | RNNoise, silence/beats; scenes, reframing, auto color; push-pull fill |

## Agents (`src/core/commands.ts`, `src/agent/`)

```
UI ─┐
window.klip ─┤
MCP server ⇄ WebSocket :5299 ⇄ bridge.ts ─┼──▶ execute(Command) ──▶ store (undoable)
Assistant (Claude Opus 5.5, tool loop) ─┘
```

- `COMMAND_SPECS` is the schema for both the Claude tools and MCP.
- `agent/assistant.ts`: a hand-written tool loop, server-side model fallback (`fallbacks: "default"`), append-only history.

## State, persistence and language

- `core/store.ts` (Zustand): project, assets, selection, time, playback, history (undo/redo), task cards.
- `core/persistence.ts` + `ui/useAutosave.ts`: IndexedDB autosave, `.klip` zip archive.
- `i18n/`: `tr('English text')` returns the text in the selected language; English is the source, Turkish lives in `i18n/tr.ts`.
- `public/sw.js`: PWA cache (pages network-first, files cache-first).
