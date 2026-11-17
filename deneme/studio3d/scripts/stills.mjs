// Önizleme: verilen saniyelerden kare çıkarır ve tek bir kontak sayfasında birleştirir.
// Kullanım: node scripts/stills.mjs <klasör> 3 9.5 ...
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const [outDir, ...secs] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const chromiumOptions = {gl: 'angle'};
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const puppeteerInstance = await openBrowser('chrome', {chromiumOptions});
const composition = await selectComposition({serveUrl, id: process.env.COMP ?? 'InternetReel', puppeteerInstance, chromiumOptions});
const files = [];
for (const s of secs) {
  const output = path.join(outDir, `t${s}.jpg`);
  const t0 = Date.now();
  await renderStill({serveUrl, composition, puppeteerInstance, chromiumOptions, frame: Math.round(Number(s) * 30), output, scale: 0.5, imageFormat: 'jpeg', jpegQuality: 85});
  files.push(output);
  console.log('ok', s, `${Date.now() - t0}ms`);
}
await puppeteerInstance.close({silent: true});

// Kontak sayfası: 4 sütun
const cols = Math.min(4, files.length);
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ['-i', f]);
const pad = cols * rows - files.length;
const blanks = Array.from({length: pad}, (_, i) => `color=c=black:s=540x960:d=1[b${i}]`).join(';');
const labels = [...files.map((_, i) => `[${i}:v]`), ...Array.from({length: pad}, (_, i) => `[b${i}]`)].join('');
const layout = Array.from({length: cols * rows}, (_, i) => `${(i % cols) * 540}_${Math.floor(i / cols) * 960}`).join('|');
const stack = cols * rows > 1 ? `${labels}xstack=inputs=${cols * rows}:layout=${layout},` : `${labels}`;
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${blanks ? blanks + ';' : ''}${stack}scale=${cols * 270}:-1`, '-frames:v', '1', path.join(outDir, 'sheet.jpg')]);
console.log('sheet', path.join(outDir, 'sheet.jpg'));
