import { expect, test, type Page } from '@playwright/test';
import { addToMain, importMedia, litRatio, openEditor, seek } from './helpers';

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
const brightness = (page: Page) =>
  page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 18;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(gl, 0, 0, 32, 18);
    const d = ctx.getImageData(0, 0, 32, 18).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
    return sum / (d.length / 4);
  });

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('stickers, motion presets, layouts, duplicates and copy/paste', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;

  // A sticker is an overlay image that pops in; the Stickers tab adds one with a click.
  const sticker = await run(page, { name: 'add_sticker', emoji: '🔥', start: 0.5 });
  expect((await state(page)).clips.find((c) => c.id === sticker.clipId)).toMatchObject({ track: 'overlay', start: 0.5, duration: 3, asset: 'Sticker 🔥.png' });
  await page.locator('.side-tab', { hasText: 'Stickers' }).click();
  await page.locator('.sticker', { hasText: '✅' }).click();
  await expect.poll(async () => (await state(page)).clips.filter((c) => c.track === 'overlay').length).toBe(2);

  // Ken Burns: two scale keyframes spanning the clip.
  await run(page, { name: 'apply_motion', clipId: main.id, preset: 'zoomin' });
  const keys = (await clipField(page, main.id, 'keyframes')) as { prop: string; time: number; value: number }[];
  expect(keys.filter((k) => k.prop === 'scale').map((k) => k.value)).toEqual([1, 1.15]);

  // Split screen: the video as an overlay filling the top half of a vertical project, cropped to fit.
  await run(page, { name: 'set_aspect', aspect: '9:16' });
  const asset = (await state(page)).assets[0];
  const overlay = await run(page, { name: 'add_media', assetId: asset.id, track: 'overlay', start: 0 });
  await run(page, { name: 'apply_layout', clipId: overlay.clipId, preset: 'top' });
  expect(await clipField(page, overlay.clipId as string, 'transform')).toMatchObject({ x: 0.5, y: 0.25, scale: 1 });
  expect(await clipField(page, overlay.clipId as string, 'crop')).not.toBeNull();

  // Duplicate inserts a copy right after the clip on the magnetic main track; copy/paste works by keyboard.
  const copy = await run(page, { name: 'duplicate_clip', clipId: main.id });
  const mains = (await state(page)).clips.filter((c) => c.track === 'main');
  expect(mains.map((c) => c.id)).toEqual([main.id, copy.clipId]);
  expect(mains[1].start).toBeCloseTo(main.duration, 2);
  await page.locator('.clip.main').first().click();
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await expect.poll(async () => (await state(page)).clips.filter((c) => c.track === 'main').length).toBe(3);
});

test('extract audio and normalize loudness', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  const audio = await run(page, { name: 'extract_audio', clipId: main.id });
  expect((await state(page)).clips.find((c) => c.id === audio.clipId)).toMatchObject({ track: 'audio', start: main.start, duration: main.duration });
  expect(await clipField(page, main.id, 'muted')).toBe(true);
  const { volume } = await run(page, { name: 'normalize_volume', clipId: audio.clipId, target: -20 });
  expect(volume).toBeGreaterThan(0);
  expect(await clipField(page, audio.clipId as string, 'volume')).toBeCloseTo(volume as number, 5);
});

test('color adjustments, caption styles and text animations render', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  await seek(page, 1);
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.5);
  const before = await brightness(page);

  // Lower exposure darkens the picture; the new uniforms compile in the layer shader.
  await run(page, { name: 'update_clip', clipId: main.id, changes: { filter: { exposure: -1, shadows: -0.5, hue: 0.3, grain: 0.4, fade: 0.2 } } });
  await expect.poll(() => brightness(page)).toBeLessThan(before * 0.8);

  // A one-word caption and a word-by-word animation draw without errors.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await run(page, { name: 'add_text', text: 'Bir kelime bir anda', start: 0, duration: 3, preset: 'single', animation: 'rise' });
  await run(page, { name: 'add_text', text: 'Kutulu kelime', start: 0, duration: 3, preset: 'highlight', animation: 'bounce' });
  await seek(page, 1.6);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('overlay and soft light blend with the picture underneath', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const asset = (await state(page)).assets[0];
  const { clipId } = await run(page, { name: 'add_media', assetId: asset.id, track: 'overlay', start: 0 });
  await run(page, { name: 'update_clip', clipId, changes: { transform: { scale: 1 } } });
  await run(page, { name: 'seek', time: 1.01 });
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.9);
  const center = () =>
    page.evaluate(() => {
      const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(gl, gl.width * 0.5, gl.height * 0.5, 1, 1, 0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
    });
  await page.waitForTimeout(300);
  const base = await center(); // the same picture over itself
  const overlay = (b: number) => (b < 128 ? (2 * b * b) / 255 : 255 - (2 * (255 - b) * (255 - b)) / 255);
  await run(page, { name: 'update_clip', clipId, changes: { blend: 'overlay' } });
  await expect.poll(async () => (await center()).every((v, i) => Math.abs(v - overlay(base[i])) < 14)).toBe(true);
  await run(page, { name: 'update_clip', clipId, changes: { blend: 'softlight' } });
  const softLight = (v: number) => {
    const b = v / 255;
    return 255 * (b < 0.5 ? 2 * b * b + b * b * (1 - 2 * b) : Math.sqrt(b) * (2 * b - 1) + 2 * b * (1 - b));
  };
  await expect.poll(async () => (await center()).every((v, i) => Math.abs(v - softLight(base[i])) < 14)).toBe(true);
});

test('music beds end with the video, fade and dip under speech', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  const { clipId } = await run(page, { name: 'add_sound_effect', sound: 'music/upbeat_background_music_696111', start: 0 });
  const music = (await state(page)).clips.find((c) => c.id === clipId)!;
  expect(music).toMatchObject({ track: 'audio', start: 0 });
  expect(music.duration).toBeCloseTo(main.duration, 1);
  expect(await clipField(page, clipId as string, 'duck')).toBe(true);
  expect(await clipField(page, clipId as string, 'fadeOut')).toBeGreaterThan(0);

  await page.locator('.side-tab', { hasText: 'Sounds' }).click();
  await page.locator('.chip', { hasText: 'Music' }).click();
  await expect(page.locator('.sound-row')).toHaveCount(17);
});

test('shift-click selects several clips; Delete removes them together', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await run(page, { name: 'add_text', text: 'Bir', start: 0, duration: 1 });
  await run(page, { name: 'add_text', text: 'İki', start: 2, duration: 1 });
  const texts = page.locator('.clip.text');
  await texts.nth(0).click();
  await texts.nth(1).click({ modifiers: ['Shift'] });
  await expect(page.locator('.clip.selected')).toHaveCount(2);
  await page.keyboard.press('Delete');
  await expect(page.locator('.clip.text')).toHaveCount(0);
  await expect(page.locator('.clip.main')).toHaveCount(1);
});

test('dragging one of several selected clips moves the group', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await run(page, { name: 'add_text', text: 'Bir', start: 0.5, duration: 1 });
  await run(page, { name: 'add_text', text: 'İki', start: 2.5, duration: 1 });
  const texts = page.locator('.clip.text');
  await texts.nth(0).click();
  await texts.nth(1).click({ modifiers: ['Shift'] });
  const box = (await texts.nth(0).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const starts = (await state(page)).clips.filter((c) => c.track === 'text').map((c) => c.start);
  expect(starts[0]).toBeGreaterThan(0.6);
  expect(starts[1] - starts[0]).toBeCloseTo(2, 2);
});

test('a picture clip can be dragged from the overlay track to the main track', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const asset = (await state(page)).assets[0];
  await run(page, { name: 'add_media', assetId: asset.id, track: 'overlay', start: 0 });
  const overlay = page.locator('.clip.overlay').first();
  const box = (await overlay.boundingBox())!;
  const mainTrack = (await page.locator('.track.main').boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, mainTrack.y + mainTrack.height / 2, { steps: 6 });
  await expect(page.locator('.track.main.drop-target')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await expect(page.locator('.clip.overlay')).toHaveCount(0);
});

test('new voice effects render a processed copy', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  const [main] = (await state(page)).clips;
  for (const preset of ['cave', 'megaphone', 'radio', 'monster']) {
    expect((await run(page, { name: 'voice_effect', clipId: main.id, preset })).error).toBeUndefined();
  }
  expect((await state(page)).clips.filter((c) => c.track === 'audio')).toHaveLength(4);
});

test('the frame under the playhead saves as a full-size PNG', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await run(page, { name: 'seek', time: 1 });
  await page.locator('.topbar .btn.primary').click();
  const download = page.waitForEvent('download');
  await page.locator('.modal button', { hasText: 'Save frame (PNG)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('klip-frame-1.00s.png');
  const path = await file.path();
  const bytes = await import('node:fs').then((fs) => fs.readFileSync(path));
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(1920); // width from the IHDR chunk
});
