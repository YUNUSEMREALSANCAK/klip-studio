import { expect, test, type Page } from '@playwright/test';
import { addToMain, importMedia, litRatio, openEditor } from './helpers';

type State = { clips: { id: string; track: string; start: number; duration: number; asset?: string }[]; assets: { id: string; name: string }[] };
type Klip = { execute: (command: object) => Promise<Record<string, unknown>>; state: () => Promise<State> };

const run = (page: Page, command: object) =>
  page.evaluate((c) => (window as unknown as { klip: Klip }).klip.execute(c).catch((e: Error) => ({ error: e.message })), command);
const state = (page: Page) => page.evaluate(() => (window as unknown as { klip: Klip }).klip.state());
const clipField = (page: Page, id: string, field: string) =>
  page.evaluate(
    async ([clipId, key]) => {
      const { useEditor } = await import('/src/core/store.ts');
      const clip = useEditor.getState().project.clips.find((c: { id: string }) => c.id === clipId);
      return JSON.parse(JSON.stringify(clip?.[key as keyof typeof clip] ?? null));
    },
    [id, field],
  );
const pixel = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(gl, gl.width * px, gl.height * py, 1, 1, 0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
    },
    [x, y],
  );

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('crop narrows the picture and blend modes change how an overlay mixes', async ({ page }) => {
  await importMedia(page, 'gradient.webm', 'square.png');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  await run(page, { name: 'seek', time: 1 });
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.9);

  await run(page, { name: 'update_clip', clipId: main.id, changes: { crop: { x: 0.25, width: 0.5 } } });
  expect(await clipField(page, main.id, 'crop')).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
  await expect.poll(() => litRatio(page)).toBeLessThan(0.6);
  await run(page, { name: 'update_clip', clipId: main.id, changes: { crop: null } });
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.9);

  const assets = (await state(page)).assets;
  const { clipId } = await run(page, { name: 'add_media', assetId: assets[1].id, track: 'overlay', start: 0 });
  await run(page, { name: 'update_clip', clipId, changes: { transform: { scale: 1 } } });
  await run(page, { name: 'seek', time: 1.01 });
  await page.waitForTimeout(300);
  const normal = await pixel(page, 0.5, 0.5);
  await run(page, { name: 'update_clip', clipId, changes: { blend: 'multiply' } });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5)).join()).not.toBe(normal.join());
  await run(page, { name: 'update_clip', clipId, changes: { blend: 'screen' } });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5)).join()).not.toBe(normal.join());
});

test('keyframes, text styles, masks and green screen are available to agents', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  await run(page, { name: 'set_keyframe', clipId: main.id, prop: 'scale', time: 0, value: 1 });
  await run(page, { name: 'set_keyframe', clipId: main.id, prop: 'scale', time: 2, value: 0.5 });
  await run(page, { name: 'set_keyframe', clipId: main.id, prop: 'scale', time: 2, value: 0.6 });
  expect(await clipField(page, main.id, 'keyframes')).toEqual([
    { prop: 'scale', time: 0, value: 1 },
    { prop: 'scale', time: 2, value: 0.6 },
  ]);
  await run(page, { name: 'clear_keyframes', clipId: main.id });
  expect(await clipField(page, main.id, 'keyframes')).toEqual([]);

  await run(page, { name: 'update_clip', clipId: main.id, changes: { mask: { shape: 'rect' }, chroma: { color: '#00ff00' } } });
  expect((await clipField(page, main.id, 'mask')).feather).toBe(0.1);
  expect((await clipField(page, main.id, 'chroma')).similarity).toBe(0.4);

  const text = await run(page, { name: 'add_text', text: 'Styled' });
  const styled = await run(page, {
    name: 'update_clip',
    clipId: text.clipId,
    changes: { outlineColor: '#ff0000', outlineWidth: 0.2, shadow: true, letterSpacing: 0.1 },
  });
  expect(styled.error).toBeUndefined();
  await page.locator('.clip.text').click();
  await expect(page.locator('.inspector')).toContainText('Outline & shadow');
});

test('voice effects and sound effects add new audio clips', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;

  expect((await run(page, { name: 'voice_effect', clipId: main.id, preset: 'chipmunk' })).error).toBeUndefined();
  const voiced = (await state(page)).clips.find((c) => c.track === 'audio');
  expect(voiced?.asset).toContain('(chipmunk voice)');
  expect(Math.abs(voiced!.duration - main.duration)).toBeLessThan(0.05);
  expect(await clipField(page, main.id, 'muted')).toBe(true);

  const sfx = await run(page, { name: 'add_sound_effect', effect: 'whoosh', start: 1 });
  const whoosh = (await state(page)).clips.find((c) => c.id === sfx.clipId);
  expect(whoosh).toMatchObject({ track: 'audio', start: 1 });
  expect(whoosh!.duration).toBeCloseTo(0.8, 1);

  await page.locator('.side-tab', { hasText: 'Media' }).click();
  await page.locator('.tile', { hasText: 'Ding' }).click();
  await expect(page.locator('.asset', { hasText: 'Ding' })).toHaveCount(1);
});

test('freeze frame and reverse work as commands', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  expect((await run(page, { name: 'freeze_frame', clipId: main.id, time: 1 })).error).toBeUndefined();
  await expect(page.locator('.clip.main')).toHaveCount(3);
  const first = (await state(page)).clips[0];
  expect((await run(page, { name: 'reverse_clip', clipId: first.id })).error).toBeUndefined();
  expect((await state(page)).assets.some((a) => a.name.includes('(reversed)'))).toBe(true);
});

test('effects have parameters and fades, clips have in/out animations, transitions have easing', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 0);
  const [first, second] = (await state(page)).clips;

  // A parameter declared in the code drives the render.
  const { effectId } = await run(page, {
    name: 'create_effect',
    kind: 'filter',
    title: 'Red level',
    code: 'uniform float level; // = 0.0 [0, 1]\nvec4 effect(vec4 color, vec2 uv) { return vec4(level, 0.0, 0.0, 1.0); }',
  });
  await run(page, { name: 'set_filter', clipId: first.id, effectId, params: { level: 1 } });
  await run(page, { name: 'seek', time: 2 });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeGreaterThan(240);

  // The effect fades in over 2 s.
  await run(page, { name: 'set_filter', clipId: first.id, effectId, fadeIn: 2 });
  await run(page, { name: 'seek', time: 0.1 });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[0]).toBeLessThan(120);

  // A fade-in animation starts the second clip from black.
  await run(page, { name: 'update_clip', clipId: second.id, changes: { animIn: { type: 'fade', duration: 1 } } });
  await run(page, { name: 'seek', time: second.start + 0.02 });
  await expect.poll(() => litRatio(page)).toBeLessThan(0.1);
  await run(page, { name: 'seek', time: second.start + 1.5 });
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.9);

  await run(page, { name: 'set_transition', toClipId: second.id, effectId: 'lib_t_swirl', easing: 'easeInOut', params: { strength: 10 } });
  expect(await clipField(page, second.id, 'transition')).toMatchObject({ effectId: 'lib_t_swirl', easing: 'easeInOut', params: { strength: 10 } });

  // Every card carries the full set of settings.
  const card = (name: string) => page.locator('.applied-card').filter({ has: page.locator('.applied-card-title', { hasText: name }) });
  await expect(card('Red level')).toContainText('Level');
  await expect(card('Red level')).toContainText('Fade in');
  await expect(card('Red level')).toContainText('Fade out');
  await expect(card('Swirl')).toContainText('Easing');
  await expect(card('Swirl')).toContainText('Strength');
  await expect(card('Fade')).toContainText('Out');
  await card('Fade').locator('select').last().selectOption('zoom');
  expect(await clipField(page, second.id, 'animOut')).toEqual({ type: 'zoom', duration: 0.5 });
});
