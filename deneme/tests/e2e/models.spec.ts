import { expect, test } from '@playwright/test';
import { addToMain, importMedia, openEditor, seek } from './helpers';

// Downloads and runs the real models (local only): npx playwright test --grep @models
test.describe('local AI models @models', () => {
  test.setTimeout(600_000);

  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  const waitTasks = async (page: import('@playwright/test').Page) => {
    await expect(page.locator('.task:not(.error)')).toHaveCount(0, { timeout: 540_000 });
    const errors = await page.locator('.task.error').allInnerTexts();
    expect(errors).toEqual([]);
  };

  test('captions are translated from Turkish to English (opus-mt)', async ({ page }) => {
    await page.locator('.side-tab', { hasText: 'Text' }).click();
    await page.locator('.tile', { hasText: 'Subtitle' }).click();
    await page.locator('.inspector textarea').fill('Bugün hava çok güzel');
    await page.locator('.side-tab', { hasText: 'AI' }).click();
    await page.locator('.ai-card', { hasText: 'Caption translation' }).locator('button', { hasText: 'Translate' }).click();
    await waitTasks(page);
    const texts = await page.locator('.clip.text .clip-label').allInnerTexts();
    expect(texts.join(' ').toLowerCase()).toMatch(/weather|today|beautiful|nice/);
  });

  test('text is spoken in English (MMS-TTS)', async ({ page }) => {
    await page.locator('.side-tab', { hasText: 'AI' }).click();
    const card = page.locator('.ai-card', { hasText: 'Voiceover' });
    await card.locator('textarea').fill('Hello and welcome to the video.');
    await card.locator('button', { hasText: 'Speak' }).click();
    await waitTasks(page);
    await expect(page.locator('.clip.audio')).toHaveCount(1);
  });

  test('the foreground is auto-selected and the background removed (BiRefNet / MODNet)', async ({ page }) => {
    await importMedia(page, 'square.png');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Select & remove object' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    await page.locator('.modal button', { hasText: 'Auto-select foreground' }).click();
    await expect(page.locator('.modal button', { hasText: 'remove background' })).toBeEnabled({ timeout: 400_000 });
    await page.locator('.modal button', { hasText: 'remove background' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('.inspector h3')).toContainText('no background');
  });

  test('a clip with background removal exports via the worker (MediaPipe)', async ({ page }) => {
    await importMedia(page, 'speech.webm');
    await addToMain(page, 0);
    await page.locator('.inspector .toggle', { hasText: 'Remove background' }).locator('.switch').click();
    const errors: string[] = [];
    page.on('console', (m) => /could not start in a worker/.test(m.text()) && errors.push(m.text()));
    await page.locator('.topbar .btn.primary').click();
    await page.locator('.modal select').first().selectOption({ label: '480p (fast)' });
    await page.locator('.modal button', { hasText: 'Start export' }).click();
    await expect(page.locator('.modal video')).toBeVisible({ timeout: 120_000 });
    expect(errors).toEqual([]);
  });

  test('LaMa fills a brushed region', async ({ page }) => {
    await importMedia(page, 'square.png');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Select & remove object' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    await page.locator('.modal .chip', { hasText: 'Brush' }).click();
    const box = (await page.locator('.object-canvas canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await page.locator('.modal .chip', { hasText: 'High (LaMa)' }).click();
    await page.locator('.modal button', { hasText: 'Nesneyi sil' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 500_000 });
    await expect(page.locator('.inspector h3')).toContainText('cleaned');
  });

  test('an object is removed across the whole clip (SlimSAM)', async ({ page }) => {
    await importMedia(page, 'gradient.webm');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Select & remove object' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    const box = (await page.locator('.object-canvas canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(page.locator('.modal button', { hasText: 'Remove across the whole video' })).toBeEnabled({ timeout: 60_000 });
    await page.locator('.modal button', { hasText: 'Remove across the whole video' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 500_000 });
    await expect(page.locator('.inspector h3')).toContainText('object removed');
  });
});

test.describe('video object isolation @models', () => {
  test.setTimeout(600_000);

  test('an object is isolated in a video and chroma key is applied (SlimSAM)', async ({ page }) => {
    await openEditor(page);
    await importMedia(page, 'gradient.webm');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Select & remove object' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    const box = (await page.locator('.object-canvas canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const isolate = page.locator('.modal button', { hasText: 'Isolate object in video' });
    await expect(isolate).toBeEnabled({ timeout: 60_000 });
    await isolate.click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 500_000 });
    await expect(page.locator('.inspector h3')).toContainText('object isolated');
    await expect(page.locator('.inspector details', { hasText: 'Green screen' }).locator('.switch.on')).toHaveCount(1);
  });
});

test.describe('AI frame interpolation @models', () => {
  test.setTimeout(600_000);

  test('a 0.5× clip exports with RIFE', async ({ page }) => {
    await openEditor(page);
    await importMedia(page, 'gradient.webm');
    await addToMain(page, 0);
    await page.locator('.inspector details', { hasText: 'Speed' }).locator('.chip', { hasText: '0.5×' }).click();
    await page.locator('.inspector .chip', { hasText: 'AI (RIFE)' }).click();
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    await page.locator('.topbar .btn.primary').click();
    await page.locator('.modal select').first().selectOption({ label: '480p (fast)' });
    await page.locator('.modal button', { hasText: 'Start export' }).click();
    const video = page.locator('.modal video');
    await expect(video).toBeVisible({ timeout: 500_000 });
    const duration = await video.evaluate(
      (v: HTMLVideoElement) => new Promise<number>((r) => (v.readyState >= 1 ? r(v.duration) : (v.onloadedmetadata = () => r(v.duration)))),
    );
    expect(duration).toBeGreaterThan(7.5);
    expect(workers.some((url) => url.includes('rife'))).toBe(true);
  });
});
