import { expect, test } from '@playwright/test';
import { addToMain, importMedia, openEditor, seek } from './helpers';

// Gerçek modelleri indirip çalıştırır (yalnız yerelde): npx playwright test --grep @models
test.describe('yerel yapay zeka modelleri @models', () => {
  test.setTimeout(600_000);

  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  const waitTasks = async (page: import('@playwright/test').Page) => {
    await expect(page.locator('.task:not(.error)')).toHaveCount(0, { timeout: 540_000 });
    const errors = await page.locator('.task.error').allInnerTexts();
    expect(errors).toEqual([]);
  };

  test('altyazı Türkçeden İngilizceye çevrilir (opus-mt)', async ({ page }) => {
    await page.locator('.side-tab', { hasText: 'Metin' }).click();
    await page.locator('.tile', { hasText: 'Alt yazı' }).click();
    await page.locator('.inspector textarea').fill('Bugün hava çok güzel');
    await page.locator('.side-tab', { hasText: 'Yapay Zeka' }).click();
    await page.locator('.ai-card', { hasText: 'Altyazı çevirisi' }).locator('button', { hasText: 'Çevir' }).click();
    await waitTasks(page);
    const texts = await page.locator('.clip.text .clip-label').allInnerTexts();
    expect(texts.join(' ').toLowerCase()).toMatch(/weather|today|beautiful|nice/);
  });

  test('metin İngilizce seslendirilir (MMS-TTS)', async ({ page }) => {
    await page.locator('.side-tab', { hasText: 'Yapay Zeka' }).click();
    const card = page.locator('.ai-card', { hasText: 'Seslendirme' });
    await card.locator('textarea').fill('Hello and welcome to the video.');
    await card.locator('button', { hasText: 'Seslendir' }).click();
    await waitTasks(page);
    await expect(page.locator('.clip.audio')).toHaveCount(1);
  });

  test('ön plan otomatik seçilir ve arka plan silinir (BiRefNet / MODNet)', async ({ page }) => {
    await importMedia(page, 'square.png');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Nesne seç ve sil' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    await page.locator('.modal button', { hasText: 'Ön planı otomatik seç' }).click();
    await expect(page.locator('.modal button', { hasText: 'arka planı sil' })).toBeEnabled({ timeout: 400_000 });
    await page.locator('.modal button', { hasText: 'arka planı sil' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('.inspector h3')).toContainText('arka plansız');
  });

  test('LaMa ile fırçayla işaretlenen bölge doldurulur', async ({ page }) => {
    await importMedia(page, 'square.png');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Nesne seç ve sil' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    await page.locator('.modal .chip', { hasText: 'Fırça' }).click();
    const box = (await page.locator('.object-canvas canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await page.locator('.modal .chip', { hasText: 'Yüksek (LaMa)' }).click();
    await page.locator('.modal button', { hasText: 'Nesneyi sil' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 500_000 });
    await expect(page.locator('.inspector h3')).toContainText('temizlenmiş');
  });

  test('videoda nesne tüm klip boyunca silinir (SlimSAM)', async ({ page }) => {
    await importMedia(page, 'gradient.webm');
    await addToMain(page, 0);
    await seek(page, 1);
    await page.locator('.inspector button', { hasText: 'Nesne seç ve sil' }).click();
    await expect(page.locator('.modal .progress')).toHaveCount(0, { timeout: 300_000 });
    const box = (await page.locator('.object-canvas canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(page.locator('.modal button', { hasText: 'Videonun tamamında sil' })).toBeEnabled({ timeout: 60_000 });
    await page.locator('.modal button', { hasText: 'Videonun tamamında sil' }).click();
    await expect(page.locator('.modal')).toHaveCount(0, { timeout: 500_000 });
    await expect(page.locator('.inspector h3')).toContainText('nesne silindi');
  });
});
