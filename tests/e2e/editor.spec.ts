import { expect, test } from '@playwright/test';
import { addToMain, importMedia, litRatio, openEditor, seek, timecode } from './helpers';

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('a video is imported, added to the main track and drawn in the preview', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await expect(page.locator('.clip.main')).toHaveCount(1);
  await seek(page, 1);
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.5);
});

test('a transition is added at the cut between two clips', async ({ page }) => {
  await importMedia(page, 'speech.webm', 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 1);
  await page.locator('.transition-badge').first().click();
  await expect(page.locator('.transition-badge:not(.empty)')).toHaveCount(1);
  await page.locator('.side-tab', { hasText: 'Transition' }).click();
  await expect(page.locator('.notice')).toContainText('Cut 1');
});

test('split and undo', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await seek(page, 3);
  await page.keyboard.press('s');
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.clip.main')).toHaveCount(1);
});

test('overlapping texts go on separate lanes', async ({ page }) => {
  await page.locator('.side-tab', { hasText: 'Text' }).click();
  await page.locator('.tile', { hasText: /^Title$/ }).click();
  await page.locator('.tile', { hasText: 'Subtitle' }).click();
  const tops = await page.locator('.clip.text').evaluateAll((els) => els.map((e) => (e as HTMLElement).style.top));
  expect(new Set(tops).size).toBe(2);
});

test('the project autosaves and comes back after reload', async ({ page }) => {
  await importMedia(page, 'speech.webm', 'square.png');
  await addToMain(page, 0);
  await addToMain(page, 1);
  await expect(page.locator('.save-status')).toHaveText('Saved');
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await expect(page.locator('.asset')).toHaveCount(2);
});

test('a .klip file can be saved and reopened', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const download = page.waitForEvent('download');
  await page.locator('.topbar button', { hasText: 'Save' }).click();
  const file = await (await download).path();
  page.once('dialog', (d) => d.accept());
  await page.locator('.topbar button', { hasText: 'New' }).click();
  await expect(page.locator('.clip')).toHaveCount(0);
  await page.setInputFiles('.topbar input[type=file]', file!);
  await expect(page.locator('.clip.main')).toHaveCount(1);
});

test('cutting silences shortens the timeline', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  const before = await timecode(page);
  await page.locator('.side-tab', { hasText: 'AI' }).click();
  await page.locator('.ai-card button', { hasText: 'Cut silences' }).click();
  await expect.poll(() => timecode(page), { timeout: 20_000 }).not.toBe(before);
});

test('480p export produces a playable video', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.topbar .btn.primary').click();
  await page.locator('.modal select').first().selectOption({ label: '480p (fast)' });
  await page.locator('.modal button', { hasText: 'Start export' }).click();
  const video = page.locator('.modal video');
  await expect(video).toBeVisible({ timeout: 90_000 });
  const duration = await video.evaluate(
    (v: HTMLVideoElement) => new Promise<number>((r) => (v.readyState >= 1 ? r(v.duration) : (v.onloadedmetadata = () => r(v.duration)))),
  );
  expect(duration).toBeGreaterThan(3.5);
});

test('switching to Turkish translates the UI and keeps the project', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.topbar select[title="Language"]').selectOption('tr');
  await expect(page.locator('.topbar .btn.primary')).toHaveText(/Dışa aktar/);
  await expect(page.locator('.side-tab', { hasText: 'Medya' })).toBeVisible();
  await expect(page.locator('.clip.main')).toHaveCount(1);
  await page.locator('.topbar select[title="Language"]').selectOption('en');
  await expect(page.locator('.topbar .btn.primary')).toHaveText(/Export/);
});
