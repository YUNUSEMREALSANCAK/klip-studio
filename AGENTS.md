# AGENTS.md: guide for AI agents and contributors

Klip Studio is an open-source, AI-powered video editor that runs in the browser. It is written in TypeScript + React; rendering uses WebGL2 and encoding uses WebCodecs (Mediabunny). **All AI runs locally:** the user's media is never sent to a server. Changes that break this rule will not be accepted. (The only exception is the Assistant tab, which the user enables with their own key; it sends only a project summary and preview frames.) Read this file first, then `docs/architecture.md`.

## 1. Orientation

| Read | Why |
| --- | --- |
| `docs/architecture.md` | Folder map, data model, preview/export pipeline |
| `ROADMAP.md` | Stage, coverage, what's next |
| `src/core/types.ts` | The project model every feature builds on |
| `src/core/commands.ts` | The command layer used by agents and non-UI tools |

## 2. Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # after every change
npm test             # unit tests
npm run test:e2e     # end-to-end tests (--grep @models: real models, local only)
npm run build        # same check as CI
npm run format       # Prettier
npm run mcp          # MCP server
npm run perf         # performance budget
```

## 3. Rules

1. **Local-first:** model inference happens in the browser. Don't add network requests other than model downloads.
2. **One source of geometry:** a layer's on-screen position is computed only by `src/render/layout.ts`.
3. **Preview = export:** frame assembly lives in `src/render/composeFrame.ts`; a new visual feature must look the same in both. The same rule holds for audio between `src/media/audio.ts` (mixer) and `src/render/previewEngine.ts`.
4. **Timeline operations are pure functions:** `src/core/timeline.ts` and `src/core/animation.ts` take a `Clip` and return a new value. Only `useEditor` (Zustand) changes state.
5. **Undoable:** every lasting change goes into history through `mutate(..., true)` or a prior `checkpoint()`. Use `record = false` while dragging.
6. **New model field = migration:** when adding a field to `types.ts`, add its default to `src/core/migrate.ts`; old projects and `.klip` files must keep opening.
7. **New edit = command:** every edit added to the UI must also be defined as a command in `src/core/commands.ts` so agents can use it.
8. **Heavy work in workers**, **large dependencies lazy-loaded** (`import()`).
9. **UI text is written as `tr('English text')`**, with the Turkish translation added to `src/i18n/tr.ts`. Code, comments and docs are in English; comment only when the code can't explain itself.
10. **Never return a value from an effect:** always give `useEffect(() => { ... })` a block body (e.g. `scrollTo` returns a Promise in newer browsers, which crashes React).
11. **Keep the UI quiet:** neutral greys, one accent color (`--accent`) for focus, selection and the playhead; no glows or gradients.

## 4. Adding an AI feature

1. Write the analysis/inference code under `src/ai/` (as a worker if it's heavy; for transformers.js models, adding a request type to `models.worker.ts` is usually enough).
2. Wire its effect on the timeline in `src/ui/aiActions.ts` with `runTask(...)`: progress and error cards come for free.
3. Add a card to `src/ui/AiPanel.tsx` and an option to the `run_ai` tool in `src/core/commands.ts`.
4. If a model is actually downloaded, add an `@models` test to `tests/e2e/models.spec.ts`.
5. Update the AI table in the README (with its license) and `ROADMAP.md`.

## 5. Verification

- Type check, unit and end-to-end tests must pass.
- For visual changes, try it in the browser and check that the preview matches the exported video.
- If you added UI text, check it in Turkish too (top bar → TR).
