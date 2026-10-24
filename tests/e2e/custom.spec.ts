import { expect, test, type Page } from '@playwright/test';
import { addToMain, fixture, importMedia, openEditor } from './helpers';

type Klip = { execute: (command: object) => Promise<Record<string, unknown>>; state: () => Promise<{ clips: { id: string; start: number }[] }> };

const run = (page: Page, command: object) =>
  page.evaluate((c) => (window as unknown as { klip: Klip }).klip.execute(c).catch((e: Error) => ({ error: e.message })), command);

const fontLoaded = (page: Page, family: string) =>
  page.evaluate((f) => [...document.fonts].some((face) => face.family.replace(/"/g, '') === f && face.status === 'loaded'), family);

// Average color of the middle of the preview.
const centerColor = (page: Page) =>
  page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(gl, gl.width * 0.4, gl.height * 0.4, gl.width * 0.2, gl.height * 0.2, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    const sum = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += d[i + k];
    return sum.map((v) => Math.round(v / 64));
  });

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('an agent writes a custom transition and filter in GLSL, and fixes compile errors', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 0);
  const { clips } = await page.evaluate(() => (window as unknown as { klip: Klip }).klip.state());

  const broken = await run(page, { name: 'create_effect', kind: 'transition', title: 'Red', code: 'vec4 transition(vec2 uv) {\n  return vec3(1.0);\n}' });
  expect(String(broken.error)).toMatch(/GLSL error[\s\S]*0:2/);

  const red = await run(page, {
    name: 'create_effect',
    kind: 'transition',
    title: 'Red flash',
    code: 'vec4 transition(vec2 uv) { return vec4(1.0, 0.0, 0.0, 1.0); }',
  });
  await run(page, { name: 'set_transition', toClipId: clips[1].id, effectId: red.effectId, duration: 1 });
  await run(page, { name: 'seek', time: clips[1].start });
  await expect.poll(() => centerColor(page)).toEqual([255, 0, 0]);

  const green = await run(page, {
    name: 'create_effect',
    kind: 'filter',
    title: 'All green',
    code: 'vec4 effect(vec4 color, vec2 uv) { return vec4(0.0, 1.0, 0.0, 1.0); }',
  });
  await run(page, { name: 'set_filter', clipId: clips[0].id, effectId: green.effectId });
  await run(page, { name: 'seek', time: 0.3 });
  await expect.poll(() => centerColor(page)).toEqual([0, 255, 0]);

  // Half strength mixes with the original picture.
  await run(page, { name: 'set_filter', clipId: clips[0].id, effectId: green.effectId, amount: 0.5 });
  await expect.poll(async () => (await centerColor(page))[1]).toBeLessThan(250);

  // Deleting the transition falls back to the built-in type.
  await run(page, { name: 'delete_effect', effectId: red.effectId });
  await run(page, { name: 'seek', time: clips[1].start });
  await expect.poll(async () => (await centerColor(page))[0]).toBeLessThan(250);
});

test('a custom filter is written in the editor, with inline compile errors', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.clip.main').first().click();
  await page.locator('.side-tab', { hasText: 'Filter' }).click();
  await page.locator('.tile', { hasText: '+ New filter' }).click();
  await page.locator('#effect-name').fill('Invert');
  await page.locator('#effect-code').fill('vec4 effect(vec4 color, vec2 uv) { return 1.0 - color.rgb; }');
  await page.locator('.modal button', { hasText: 'Save' }).click();
  await expect(page.locator('.code-error')).toContainText('GLSL error');

  await page.locator('#effect-code').fill('vec4 effect(vec4 color, vec2 uv) { return vec4(1.0 - color.rgb, color.a); }');
  await page.locator('.modal button', { hasText: 'Save' }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.locator('.custom-tile.active')).toHaveText('Invert');
  await expect(page.locator('.inspector select').filter({ hasText: 'Invert' })).toHaveValue(/^fx_/);
});

test('fonts are added from a file or from Google Fonts by name', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/css2?family=Not%20A%20Font*', (route) => route.fulfill({ status: 400, body: 'bad family' }));
  await page.route('https://fonts.googleapis.com/css2?family=Space%20Grotesk*', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.locator('.side-tab', { hasText: 'Text' }).click();

  await page.setInputFiles('input[type=file][accept*=".woff2"]', fixture('bungee.ttf'));
  await expect(page.locator('.chip', { hasText: 'bungee' })).toBeVisible();
  expect(await fontLoaded(page, 'bungee')).toBe(true);

  expect((await run(page, { name: 'add_font', family: 'Not A Font' })).error).toContain('Google Fonts family not found');
  expect((await run(page, { name: 'add_font', family: 'Space Grotesk' })).family).toBe('Space Grotesk');

  await page.locator('.tile', { hasText: /^Title$/ }).click();
  const fontSelect = page.locator('.inspector select').filter({ hasText: 'Inter' });
  await expect(fontSelect.locator('option', { hasText: 'bungee' })).toHaveCount(1);
  await fontSelect.selectOption('bungee');
  const state = await page.evaluate(() => (window as unknown as { klip: Klip }).klip.state());
  expect(JSON.stringify(state)).toContain('"font":"bungee"');

  // The project keeps the font file, so it survives a reload.
  await expect(page.locator('.save-status')).toHaveText('Saved');
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('.save-status')).toHaveText('Saved');
  await expect.poll(() => fontLoaded(page, 'bungee')).toBe(true);
});

test('every built-in effect and transition in the library compiles and renders', async ({ page }) => {
  const errors = await page.evaluate(async () => {
    const { EFFECT_LIBRARY } = await import('/src/render/effectLibrary.ts');
    const { validateEffect } = await import('/src/render/effects.ts');
    return EFFECT_LIBRARY.map((e: { key: string; kind: 'transition' | 'filter'; code: string }) => [e.kind, e.key, validateEffect(e)]).filter(
      ([, , error]) => error,
    );
  });
  expect(errors).toEqual([]);

  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 0);
  const { clips } = await page.evaluate(() => (window as unknown as { klip: Klip }).klip.state());
  expect((await run(page, { name: 'set_filter', clipId: clips[0].id, effectId: 'lib_glitch' })).error).toBeUndefined();
  expect((await run(page, { name: 'set_transition', toClipId: clips[1].id, effectId: 'lib_t_swirl' })).error).toBeUndefined();
  const state = await page.evaluate(() => (window as unknown as { klip: Klip }).klip.state());
  expect(JSON.stringify(state)).toContain('"transition":"lib_t_swirl"');
  await page.locator('.clip.main').first().click();
  await page.locator('.side-tab', { hasText: 'Filter' }).click();
  await expect(page.locator('.tile.active', { hasText: 'Glitch' })).toBeVisible();
});
