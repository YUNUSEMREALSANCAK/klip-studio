// Performans bütçesi ölçümü: 60 sn 1080p test videosu üretir (ffmpeg gerekir),
// önizleme kare hızını ve dışa aktarma süresini ölçer.
// Kullanım: npm run dev (ayrı terminalde), sonra: node scripts/perf.mjs
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL = process.env.KLIP_URL ?? 'http://localhost:5173/';
const BUDGET = { previewFps: 30, exportSeconds: 60 };
const dir = path.join(tmpdir(), 'klip-perf');
const video = path.join(dir, 'long1080.mp4');

if (!existsSync(video)) {
  mkdirSync(dir, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=60',
    '-t', '60', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', video]);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, locale: 'tr-TR' });
await page.goto(URL);
await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('klip-studio'); q.onsuccess = q.onerror = q.onblocked = () => r(null); }));
await page.reload();
await page.setInputFiles('.dropzone input[type=file]', video);
await page.locator('.asset').dblclick();
await page.waitForTimeout(1000);

await page.keyboard.press('Space');
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else r(n / 3); }; requestAnimationFrame(tick); }));
await page.keyboard.press('Space');

await page.locator('.topbar .btn.primary').click();
const t0 = Date.now();
await page.locator('.modal button', { hasText: 'Dışa aktarmayı başlat' }).click();
await page.waitForSelector('.modal video', { timeout: 600_000 });
const exportSeconds = (Date.now() - t0) / 1000;
await browser.close();

const row = (name, value, budget, ok) => console.log(`${ok ? '✔' : '✘'} ${name}: ${value} (bütçe ${budget})`);
row('Önizleme', `${Math.round(fps)} fps`, `≥ ${BUDGET.previewFps} fps`, fps >= BUDGET.previewFps);
row('1 dk 1080p dışa aktarma', `${exportSeconds.toFixed(1)} sn`, `< ${BUDGET.exportSeconds} sn`, exportSeconds < BUDGET.exportSeconds);
process.exitCode = fps >= BUDGET.previewFps && exportSeconds < BUDGET.exportSeconds ? 0 : 1;
