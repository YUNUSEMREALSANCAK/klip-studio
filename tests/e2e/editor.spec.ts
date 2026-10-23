import { expect, test } from '@playwright/test';
import { addToMain, importMedia, litRatio, openEditor, seek, timecode } from './helpers';

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('video içe aktarılır, ana ize eklenir ve önizlemede çizilir', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await expect(page.locator('.clip.main')).toHaveCount(1);
  await seek(page, 1);
  await expect.poll(() => litRatio(page)).toBeGreaterThan(0.5);
});

test('iki klip arasındaki kesime geçiş eklenir', async ({ page }) => {
  await importMedia(page, 'speech.webm', 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 1);
  await page.locator('.transition-badge').first().click();
  await expect(page.locator('.transition-badge:not(.empty)')).toHaveCount(1);
  await page.locator('.side-tab', { hasText: 'Geçiş' }).click();
  await expect(page.locator('.notice')).toContainText('1. kesim');
});

test('bölme ve geri alma', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  await seek(page, 3);
  await page.keyboard.press('s');
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.clip.main')).toHaveCount(1);
});

test('üst üste binen metinler ayrı şeritlere yerleşir', async ({ page }) => {
  await page.locator('.side-tab', { hasText: 'Metin' }).click();
  await page.locator('.tile', { hasText: 'Başlık' }).click();
  await page.locator('.tile', { hasText: 'Alt yazı' }).click();
  const tops = await page.locator('.clip.text').evaluateAll((els) => els.map((e) => (e as HTMLElement).style.top));
  expect(new Set(tops).size).toBe(2);
});

test('proje otomatik kaydedilir ve sayfa yenilenince geri gelir', async ({ page }) => {
  await importMedia(page, 'speech.webm', 'square.png');
  await addToMain(page, 0);
  await addToMain(page, 1);
  await expect(page.locator('.save-status')).toHaveText('Kaydedildi');
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await expect(page.locator('.asset')).toHaveCount(2);
});

test('.klip dosyası kaydedilip yeniden açılabilir', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  const download = page.waitForEvent('download');
  await page.locator('.topbar button', { hasText: 'Kaydet' }).click();
  const file = await (await download).path();
  page.once('dialog', (d) => d.accept());
  await page.locator('.topbar button', { hasText: 'Yeni' }).click();
  await expect(page.locator('.clip')).toHaveCount(0);
  await page.setInputFiles('.topbar input[type=file]', file!);
  await expect(page.locator('.clip.main')).toHaveCount(1);
});

test('sessizlik kesme süreyi kısaltır', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  await addToMain(page, 0);
  const before = await timecode(page);
  await page.locator('.side-tab', { hasText: 'Yapay Zeka' }).click();
  await page.locator('.ai-card button', { hasText: 'Sessizlikleri kes' }).click();
  await expect.poll(() => timecode(page), { timeout: 20_000 }).not.toBe(before);
});

test('480p dışa aktarma oynatılabilir bir video üretir', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.topbar .btn.primary').click();
  await page.locator('.modal select').first().selectOption({ label: '480p (hızlı)' });
  await page.locator('.modal button', { hasText: 'Dışa aktarmayı başlat' }).click();
  const video = page.locator('.modal video');
  await expect(video).toBeVisible({ timeout: 90_000 });
  const duration = await video.evaluate(
    (v: HTMLVideoElement) => new Promise<number>((r) => (v.readyState >= 1 ? r(v.duration) : (v.onloadedmetadata = () => r(v.duration)))),
  );
  expect(duration).toBeGreaterThan(3.5);
});

test('İngilizceye geçince arayüz çevrilir, proje korunur', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await page.locator('.topbar select[title="Dil / Language"]').selectOption('en');
  await expect(page.locator('.topbar .btn.primary')).toHaveText(/Export/);
  await expect(page.locator('.side-tab', { hasText: 'Media' })).toBeVisible();
  await expect(page.locator('.clip.main')).toHaveCount(1);
  await page.locator('.topbar select[title="Dil / Language"]').selectOption('tr');
  await expect(page.locator('.topbar .btn.primary')).toHaveText(/Dışa aktar/);
});
