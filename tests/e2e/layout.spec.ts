import { expect, test, type Page } from '@playwright/test';
import { addToMain, importMedia, openEditor } from './helpers';

const width = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!.width;

async function drag(page: Page, label: string, dx: number, dy: number) {
  const box = (await page.locator(`.splitter[aria-label="${label}"]`).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('panels resize by dragging, remember their size and reset on double-click', async ({ page }) => {
  const stage = await width(page, '.preview');
  const side = await width(page, '.side');
  await drag(page, 'Resize left panel', 80, 0);
  await drag(page, 'Resize right panel', -60, 0);
  expect(await width(page, '.side')).toBeCloseTo(side + 80, -1);
  expect(await width(page, '.preview')).toBeCloseTo(stage - 140, -1);

  const timeline = (await page.locator('.timeline').boundingBox())!.height;
  await drag(page, 'Resize timeline', 0, -50);
  expect((await page.locator('.timeline').boundingBox())!.height).toBeCloseTo(timeline + 50, -1);

  // Limits keep the panels usable.
  await drag(page, 'Resize left panel', -1000, 0);
  expect(await width(page, '.side')).toBe(220);

  await page.reload();
  expect(await width(page, '.side')).toBe(220);
  await page.locator('.splitter[aria-label="Resize left panel"]').dblclick();
  expect(await width(page, '.side')).toBe(300);
});

test('the applied effects panel lists every transition and effect with its settings, in timeline order', async ({ page }) => {
  await expect(page.locator('.applied')).toHaveCount(0);
  await importMedia(page, 'gradient.webm');
  await addToMain(page, 0);
  await addToMain(page, 0);
  await addToMain(page, 0);
  await page.evaluate(async () => {
    const klip = (window as unknown as { klip: { execute: (c: object) => Promise<unknown>; state: () => Promise<{ clips: { id: string }[] }> } }).klip;
    const { clips } = await klip.state();
    await klip.execute({ name: 'set_transition', toClipId: clips[2].id, type: 'fade' });
    await klip.execute({ name: 'set_transition', toClipId: clips[1].id, effectId: 'lib_t_swirl' });
    await klip.execute({ name: 'set_filter', clipId: clips[0].id, effectId: 'lib_shake' });
  });
  const titles = page.locator('.applied-card-title');
  const card = (name: string) => page.locator('.applied-card').filter({ has: page.locator('.applied-card-title', { hasText: name }) });
  await expect(titles).toHaveText(['Effect · Shake', 'Transition · Swirl', 'Transition · Crossfade']);

  // Settings on a card change the clip.
  const swirl = card('Swirl');
  await swirl.locator('input[type=range]').first().fill('0.5');
  await expect(swirl).toContainText('0.5 s');
  await card('Shake').locator('input[type=range]').first().fill('0.4');
  await expect(card('Shake')).toContainText('40%');

  // The title selects the clip; × removes the item.
  await swirl.locator('.applied-card-title').click();
  await expect(swirl).toHaveClass(/selected/);
  await card('Crossfade')
    .getByRole('button', { name: /Remove/ })
    .click();
  await expect(titles).toHaveCount(2);

  // It collapses to a thin strip and comes back.
  await page.locator('.applied-header button[title="Hide"]').click();
  await expect(page.locator('.applied.collapsed .badge')).toHaveText('2');
  await page.locator('.applied.collapsed button').click();
  await expect(titles).toHaveCount(2);
});
