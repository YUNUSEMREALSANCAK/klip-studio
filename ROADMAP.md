# Klip Studio roadmap

**Stage: beta (v0.5)** · next target: v1.0 (remaining AI work, quality and stability)

> **Last updated:** 2026-10-23 · **Reference app:** CapCut desktop 9.6 (for inspiration and comparison) · Percentages are estimates, not measurements.

## Where things stand

| | Value | Notes |
| --- | --- | --- |
| Core editing flow | ✅ | import → cut/split → keyframes → transitions → text → export |
| Local AI | 16 features | captions, translation, text to speech, smart cut, background removal, foreground selection, object removal (image + video, LaMa), object isolation in video, frame interpolation (RIFE), noise reduction, scenes, reframing, auto color, beats |
| Automated tests | ✅ | 24 unit + 22 end-to-end tests on every push in CI; 8 model tests run locally (`--grep @models`) |
| Project saving | ✅ | IndexedDB autosave + `.klip` files |
| Performance (Apple M5, `npm run perf`) | ✅ | 60 fps preview (budget ≥ 30) · 1 min 1080p export in 9.4 s (budget < 60 s) |
| Coverage of CapCut's core features | ~70% | weighted estimate from the table below |

### Coverage by area (vs. CapCut, estimated)

| Area | Coverage | Missing |
| --- | ---: | --- |
| Timeline | ~80% | group selection, dragging between tracks, nested sequences |
| Picture editing | ~75% | crop tool, blend modes, stabilization |
| Text and captions | ~70% | per-word styling, text effects library |
| Transitions and effects | ~55% | built-in video effects and sticker library (custom GLSL effects cover the rest) |
| Audio | ~60% | sound effects library, voice changer, Turkish text to speech |
| AI | ~75% | highlight detection, real-time general object segmentation, Turkish text to speech |
| Projects and distribution | ~70% | template sharing, cloud sync (intentionally absent: local-first) |

## Plan

Effort: **S** ≈ 2–6 hours · **M** ≈ 1–3 days · **L** ≈ 1–2 weeks (one developer + an AI agent).

### Phase 1: Solid foundation → v0.2 ✅

- [x] **Save/load projects** (M): IndexedDB autosave (project + media), export/import as `.klip` files
- [x] **Unit tests** (S): Vitest for timeline, keyframes, speed, fades and LUTs
- [x] **End-to-end tests** (M): Playwright for import, transitions, split, saving, export and more; in CI
- [x] **Multiple text and overlay lanes** (M): overlapping clips are laid out in lanes automatically
- [x] **Error boundaries and browser checks** (S): recovery screen on crash, warning for missing WebGL2/WebCodecs
- [x] **Live demo** (S): automatic deploy to GitHub Pages

### Phase 2: Editing depth → v0.3 ✅

- [x] **Speed** (M): 0.25×–4× with pitch preserved (browser in preview, WSOLA on export); freeze frame, reverse
- [x] **Speed curves** (M): Montage, Hero, Bullet time, Ease in/out; pitch preserved
- [x] **Keyframe animation** (L): position, size, rotation, opacity, volume
- [x] **Blurred canvas background** (S)
- [x] **Masks and chroma key** (M): rectangle, ellipse and linear masks; green screen
- [x] **Audio tools** (M): fade in/out, music ducking under speech, waveforms on video clips
- [x] **Text templates and fonts** (M): 12 templates, 10 Google Fonts families
- [x] **LUT (.cube) import** (S)
- [x] **Custom transitions, filters and fonts** (M): GLSL effects (gl-transitions compatible) with inline compile errors, fonts from files or Google Fonts; all saved in the project

### Phase 3: AI depth → v0.4

- [x] **Object removal in video** (L): frame-by-frame tracking with SlimSAM + multi-scale fill (experimental)
- [x] **Better fill** (M): "High" fill quality with LaMa (big-lama ONNX), for images and video
- [x] **General object segmentation** (M): one-click foreground selection in images with BiRefNet (capable GPU) / MODNet
- [x] **General object isolation in video** (M): any object via SlimSAM tracking; the background is painted a key color and chroma-keyed (experimental)
- [x] **Caption translation** (M): opus-mt, NLLB for other languages; bilingual captions
- [x] **Text to speech** (M): 11 languages with MMS-TTS
- [ ] **Turkish text to speech** (M): possible if `facebook/mms-tts-tur` is converted to ONNX and hosted (Piper voices need GPL espeak-ng)
- [x] **Heavy AI work in workers** (M): export-time person segmentation runs in its own worker (falls back to the main thread)
- [x] **Smooth slow motion** (M): frame blending (on export)
- [x] **AI frame interpolation** (L): optical-flow slow motion with RIFE 4.22 lite (on export)

### Phase 4: Built for agents → v0.5 ✅

- [x] **Command layer** (L): every edit is a typed JSON command (`src/core/commands.ts`), and every command is undoable
- [x] **Control channel** (M): `window.klip` API for commands, state, screenshots and import from URL
- [x] **MCP server** (M): `npm run mcp`; tools for state, commands, screenshots and file import
- [x] **Natural-language editing** (M): Assistant tab, Claude Opus 5.5 + command tools (user's own API key)
- [x] **Effects by description** (M): over MCP the AI writes, compiles, fixes and applies custom GLSL transitions and filters (`create_effect`, `set_filter`, `add_font`)
- [x] **Use from any AI app** (M): `npx -y klip-studio-mcp` for Claude Desktop/Code, Cursor, Codex, VS Code, Gemini CLI; shared HTTP mode, MP4 export tool, origin checks, in-app setup snippets

### Phase 5: Distribution and community → v1.0

- [x] **PWA** (S): installable app that opens offline
- [x] **English UI and docs** (M): English by default, Turkish selectable; English README with a Turkish translation
- [x] **Translated error and task messages** (S): task, progress and error messages follow the UI language
- [x] **Performance budgets** (M): `npm run perf`; preview ≥ 30 fps, 1 min 1080p export < 60 s
- [x] **Desktop packaging** (M): installable as a PWA; a double-click macOS launcher exists locally
- [x] **Minimal pro theme** (S): neutral dark palette with a single accent color

## Known issues

- Object removal in video is experimental: tracking can drift on fast-moving objects, and fills on large objects look blurry.
- Real-time background removal in video only works on people; for other objects use "Isolate object in video" (preprocessed).
- BiRefNet doesn't run on weaker GPUs; MODNet takes over (works best on people).
- There is no Turkish text-to-speech model.
- NLLB-200 and MMS-TTS are licensed for non-commercial use.
