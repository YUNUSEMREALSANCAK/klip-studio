<p align="center">
  <img src="assets/icon.svg" width="112" height="112" alt="Klip Studio icon: a play triangle and an AI sparkle on a dark cyan tile">
</p>

<h1 align="center">Klip Studio</h1>

<p align="center">
  <b>An open-source, AI-powered video editor that runs entirely in your browser.</b><br>
  Timeline, keyframes, transitions, captions, background removal and object removal —<br>
  all local. Your video is never uploaded anywhere.
</p>

<p align="center">
  <a href="https://yunusemrealsancak.github.io/klip-studio/"><b>Live demo</b></a> ·
  <a href="README.md">Türkçe</a> ·
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="AGENTS.md">For contributors & agents</a>
</p>

<p align="center">
  <img src="docs/images/klip-studio-demo.jpg" alt="Klip Studio editing a gradient video with a title, a boxed subtitle, an elliptical picture-in-picture overlay, the AI panel on the left and a multi-track timeline below" width="100%">
</p>

The interface is available in **Turkish and English** (switch in the top bar).

## Features

- **Editing:** magnetic main track, automatic lanes for overlapping clips, drag & drop, trim, split, undo/redo
- **Keyframes** for position, size, rotation, opacity and volume
- **Speed** 0.25×–4× and speed curves with pitch preserved, freeze frame, reverse
- **Look:** 12 transitions, color controls, 9 filter presets, `.cube` LUT import, shape masks, chroma key, blurred canvas background
- **Text:** 5 styles, 5 animations, 10 fonts, 12 templates, karaoke captions
- **Audio:** fade in/out, music ducking under speech
- **Projects:** autosave (IndexedDB), `.klip` project files, installable PWA that opens offline
- **Export:** MP4 (H.264/AAC), 480p–1080p, 24/30/60 fps — a 1-minute 1080p video exports in ~10 s on an Apple M5

## Local AI

| Feature | Model |
| --- | --- |
| Auto captions with word timings, SRT export | Whisper |
| Caption translation, bilingual captions | opus-mt, NLLB-200 ¹ |
| Text to speech (11 languages) | MMS-TTS ¹ |
| Cut silences and filler words | RMS energy + Whisper |
| Real-time background removal (video) | MediaPipe Selfie Segmenter |
| One-click foreground selection (images) | BiRefNet (capable GPU) / MODNet |
| Select & remove objects — from images or a whole video (experimental), fast or high-quality fill | SlimSAM + tracking + LaMa |
| Isolate any object in a video (experimental) | SlimSAM tracking + automatic chroma key |
| Smooth slow motion with AI in-between frames | RIFE 4.22 lite ² |
| Noise reduction | RNNoise |
| Scene detection, smart 9:16 reframing, beat markers, auto color | frame differencing, MediaPipe Face Detector, spectral flux |

¹ NLLB-200 and MMS-TTS are licensed for non-commercial use (CC-BY-NC 4.0).
² RIFE code is MIT-licensed; the ONNX conversion used does not state a license.

## Built for agents

Every edit is a typed JSON command (`src/core/commands.ts`), runnable from the UI, from `window.klip` in the browser, through the MCP server (`npm run mcp`, then enable "Agent connection" in project settings), or by chatting with Claude in the Assistant tab (bring your own Anthropic API key; only a project summary and preview frames are sent).

```bash
claude mcp add klip-studio -- node /path/to/klip-studio/mcp/server.mjs
```

## Getting started

```bash
git clone https://github.com/YUNUSEMREALSANCAK/klip-studio.git
cd klip-studio
npm install
npm run dev
```

`npm test` (unit), `npm run test:e2e` (Playwright), `npm run build`, `npm run perf` (performance budget).

## License

MIT or Apache-2.0, at your option. Models are downloaded at runtime under their own licenses. Inspired by short-form video editors such as CapCut; contains no CapCut code or models.
