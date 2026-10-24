import { expect, test, type Page } from '@playwright/test';
import { addToMain, fixture, importMedia, litRatio, openEditor, seek, timecode } from './helpers';

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

// Color of a point in the preview (0..1 coordinates)
const pixelAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
      const c = document.createElement('canvas');
      c.width = gl.width;
      c.height = gl.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(gl, 0, 0);
      return [...ctx.getImageData(Math.floor(px * c.width), Math.floor(py * c.height), 1, 1).data.slice(0, 3)];
    },
    [x, y],
  );

const section = (page: Page, title: string) => page.locator('.inspector details', { has: page.locator('summary', { hasText: title }) });

async function openSection(page: Page, title: string) {
  const s = section(page, title);
  if (!(await s.getAttribute('open'))) await s.locator('summary').click();
  return s;
}

test('2× speed halves the clip duration', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await section(page, 'Speed').locator('.chip', { hasText: '2×' }).click();
  await expect.poll(() => timecode(page)).toContain('00:03.00');
});

test('keyframes are added and shown on the timeline', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const sizeRow = section(page, 'Position & size').locator('.field', { hasText: 'Size' });
  await sizeRow.locator('.key-toggle').click();
  await seek(page, 2);
  await sizeRow.locator('input[type=range]').fill('0.5');
  await expect(page.locator('.clip.main .kf-dot')).toHaveCount(2);
});

test('an ellipse mask clears the corners', async ({ page }) => {
  await importMedia(page, 'square.png');
  await addToMain(page, 0);
  await seek(page, 1);
  const mask = await openSection(page, 'Mask');
  await mask.locator('.chip', { hasText: 'Ellipse' }).click();
  await expect.poll(() => pixelAt(page, 0.5, 0.5).then((p) => p[0] + p[1] + p[2])).toBeGreaterThan(100);
  await expect.poll(() => pixelAt(page, 0.3, 0.06).then((p) => p[0] + p[1] + p[2])).toBeLessThan(30);
});

test('chroma key makes the chosen color transparent', async ({ page }) => {
  await importMedia(page, 'square.png');
  await addToMain(page, 0);
  await seek(page, 1);
  const chroma = await openSection(page, 'Green screen');
  await chroma.locator('.switch').click();
  await chroma.locator('input[type=color]').fill('#7c3aed');
  await expect.poll(() => litRatio(page)).toBeLessThan(0.05);
});

test('a LUT is imported and changes colors', async ({ page }) => {
  await importMedia(page, 'square.png');
  await addToMain(page, 0);
  await seek(page, 1);
  const before = await pixelAt(page, 0.5, 0.5);
  await page.setInputFiles('.inspector input[accept=".cube"]', fixture('invert.cube'));
  await expect(section(page, 'Color').locator('.field', { hasText: 'LUT (color table)' }).locator('select')).toHaveValue(/.+/);
  await expect.poll(() => pixelAt(page, 0.5, 0.5).then((p) => Math.abs(p[1] - before[1]))).toBeGreaterThan(100);
});

test('blurred canvas fills the gaps in a vertical project', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.topbar select[title="Aspect ratio"]').selectOption('9:16');
  await seek(page, 1);
  await expect.poll(() => pixelAt(page, 0.5, 0.08).then((p) => p[0] + p[1] + p[2])).toBeLessThan(30);
  await page
    .locator('.track')
    .first()
    .click({ position: { x: 900, y: 10 } }); // deselect → project settings
  await page.locator('.inspector .toggle', { hasText: 'blur' }).locator('.switch').click();
  await seek(page, 1);
  await expect.poll(() => pixelAt(page, 0.5, 0.08).then((p) => p[0] + p[1] + p[2])).toBeGreaterThan(60);
});

test('freeze frame inserts a still', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await seek(page, 2);
  await page
    .locator('.clip.main')
    .first()
    .click({ position: { x: 20, y: 20 } });
  await section(page, 'Speed').locator('button', { hasText: 'Freeze frame' }).click();
  await expect(page.locator('.clip.main')).toHaveCount(3, { timeout: 20_000 });
  await expect.poll(() => timecode(page)).toContain('00:06.00');
});

test('reverse produces a new video asset', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await section(page, 'Speed').locator('button', { hasText: 'Reverse' }).click();
  await expect(page.locator('.inspector h3')).toContainText('(reversed)', { timeout: 60_000 });
});

test('a sped-up clip with a fade exports', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await section(page, 'Speed').locator('.chip', { hasText: '2×' }).click();
  await section(page, 'Audio').locator('.field', { hasText: 'Fade in' }).locator('input').fill('1');
  await page.locator('.topbar .btn.primary').click();
  await page.locator('.modal select').first().selectOption({ label: '480p (fast)' });
  await page.locator('.modal button', { hasText: 'Start export' }).click();
  const video = page.locator('.modal video');
  await expect(video).toBeVisible({ timeout: 90_000 });
  const duration = await video.evaluate(
    (v: HTMLVideoElement) => new Promise<number>((r) => (v.readyState >= 1 ? r(v.duration) : (v.onloadedmetadata = () => r(v.duration)))),
  );
  expect(duration).toBeGreaterThan(2.7);
  expect(duration).toBeLessThan(3.4);
});

test('a speed curve changes duration by its average and exports', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  // The "Hero moment" curve averages 1.2×: 6 s → 5 s
  await section(page, 'Speed').locator('.chip', { hasText: 'Hero moment' }).click();
  await expect.poll(() => timecode(page)).toContain('00:05.00');
  await page.locator('.topbar .btn.primary').click();
  await page.locator('.modal select').first().selectOption({ label: '480p (fast)' });
  await page.locator('.modal button', { hasText: 'Start export' }).click();
  const video = page.locator('.modal video');
  await expect(video).toBeVisible({ timeout: 90_000 });
  const duration = await video.evaluate(
    (v: HTMLVideoElement) => new Promise<number>((r) => (v.readyState >= 1 ? r(v.duration) : (v.onloadedmetadata = () => r(v.duration)))),
  );
  expect(duration).toBeGreaterThan(4.6);
  expect(duration).toBeLessThan(5.4);
});
