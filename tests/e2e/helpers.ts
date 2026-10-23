import { expect, type Page } from '@playwright/test';
import path from 'node:path';

export const fixture = (name: string) => path.resolve('tests/fixtures', name);

// Opens the editor with a clean session (clears the previous autosave).
export async function openEditor(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('klip-studio');
        request.onsuccess = request.onerror = request.onblocked = () => resolve(null);
      }),
  );
  await page.reload();
  await expect(page.locator('.save-status')).toHaveText('Saved');
}

export async function importMedia(page: Page, ...names: string[]) {
  const before = await page.locator('.asset').count();
  await page.locator('.side-tab', { hasText: 'Media' }).click();
  await page.setInputFiles('.dropzone input[type=file]', names.map(fixture));
  await expect(page.locator('.asset')).toHaveCount(before + names.length, { timeout: 20_000 });
}

export async function addToMain(page: Page, index: number) {
  await page.locator('.asset').nth(index).dblclick();
}

// Share of non-black pixels in the preview canvas (0..1)
export function litRatio(page: Page) {
  return page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('.stage canvas')!;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 36;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(gl, 0, 0, 64, 36);
    const d = ctx.getImageData(0, 0, 64, 36).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
    return lit / (d.length / 4);
  });
}

export async function seek(page: Page, seconds: number) {
  const zoom = await page.locator('.tl-toolbar input[type=range]').inputValue();
  await page.locator('.ruler').click({ position: { x: seconds * Number(zoom) + 1, y: 10 } });
}

export const timecode = (page: Page) => page.locator('.timecode').innerText();
