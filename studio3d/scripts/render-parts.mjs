// Klip projesi için parçaları üretir:
//   out/<reel>/sahneler/NN_<sahne>.mp4  temiz 3D sahneler (etiketsiz, sessiz), geçişler içinde
//   out/<reel>/katman/<parça>.webm      her etiket / bölüm / kapanış için şeffaf video (VP9 + alfa)
//   out/<reel>/parts.json               parçaların zaman çizelgesindeki yerleri (build-klip.mjs okur)
// Kullanım: node scripts/render-parts.mjs <reel> [--only=overlay|scenes]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import * as esbuild from 'esbuild';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const REELS = {internet: {composition: 'InternetReel'}};

const reel = process.argv[2] ?? 'internet';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
if (!REELS[reel]) throw new Error(`Bilinmeyen reel: ${reel} (${Object.keys(REELS).join(', ')})`);

const FPS = 30;
const outDir = path.resolve('out', reel);
const sceneDir = path.join(outDir, 'sahneler');
const layerDir = path.join(outDir, 'katman');
mkdirSync(sceneDir, {recursive: true});
mkdirSync(layerDir, {recursive: true});

// Reel'in zaman çizelgesi ve katman parçaları (TSX'ten esbuild ile okunur)
const manifestFile = path.join(outDir, '.manifest.mjs');
await esbuild.build({
  stdin: {
    contents: `export {OVERLAY_PARTS} from './src/reels/${reel}/overlay/Overlay'; export {SCENES, OUTRO_AT, TOTAL_FRAMES} from './src/reels/${reel}/timeline';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: manifestFile,
  packages: 'external',
  jsx: 'automatic',
  logLevel: 'error',
});
const {OVERLAY_PARTS, SCENES, OUTRO_AT, TOTAL_FRAMES} = await import(pathToFileURL(manifestFile).href);
const total = TOTAL_FRAMES / FPS;

// Sahneler, çapraz geçişin ortasından kesilir; kesimler kare sınırına oturur
const keys = Object.keys(SCENES);
const scenes = keys.map((key, i) => {
  const start = i === 0 ? 0 : (SCENES[keys[i - 1]][1] + SCENES[key][0]) / 2;
  const end = i === keys.length - 1 ? total : (SCENES[key][1] + SCENES[keys[i + 1]][0]) / 2;
  const a = Math.round(start * FPS);
  const b = Math.round(end * FPS);
  return {key, file: `sahneler/${String(i + 1).padStart(2, '0')}_${key}.mp4`, startFrame: a, frames: b - a, start: a / FPS, duration: (b - a) / FPS};
});

const layers = [...OVERLAY_PARTS, {id: 'outro', name: 'Kapanış: fityazılım', from: OUTRO_AT, to: total}].map((p) => {
  const a = Math.max(0, Math.round((p.from - 0.1) * FPS));
  const b = Math.min(TOTAL_FRAMES - 1, Math.round((p.to + 0.1) * FPS));
  return {id: p.id, name: p.name, file: `katman/${p.id}.webm`, startFrame: a, endFrame: b, start: a / FPS, duration: (b - a + 1) / FPS};
});

writeFileSync(path.join(outDir, 'parts.json'), JSON.stringify({reel, fps: FPS, duration: total, scenes, layers}, null, 2));

const chromiumOptions = {gl: 'angle'};
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const puppeteerInstance = await openBrowser('chrome', {chromiumOptions});
const compositionFor = (inputProps) =>
  selectComposition({serveUrl, id: REELS[reel].composition, inputProps, puppeteerInstance, chromiumOptions});

if (only !== 'scenes') {
  for (const layer of layers) {
    const inputProps = {mode: 'overlay', part: layer.id};
    const t0 = Date.now();
    await renderMedia({
      serveUrl,
      composition: await compositionFor(inputProps),
      inputProps,
      codec: 'vp9',
      pixelFormat: 'yuva420p',
      imageFormat: 'png',
      frameRange: [layer.startFrame, layer.endFrame],
      outputLocation: path.join(outDir, layer.file),
      muted: true,
      puppeteerInstance,
      chromiumOptions,
      concurrency: 4,
      overwrite: true,
    });
    console.log('katman', layer.id, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

if (only !== 'overlay') {
  const full = path.join(outDir, 'temiz.mp4');
  if (!existsSync(full)) {
    const inputProps = {mode: 'clean'};
    await renderMedia({
      serveUrl,
      composition: await compositionFor(inputProps),
      inputProps,
      codec: 'h264',
      crf: 16,
      outputLocation: full,
      muted: true,
      puppeteerInstance,
      chromiumOptions,
      concurrency: 4,
      onProgress: ({progress}) => {
        if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\rtemiz render %${Math.round(progress * 100)}`);
      },
    });
    console.log();
  }
  for (const s of scenes) {
    execFileSync('ffmpeg', [
      '-y', '-v', 'error',
      '-ss', String(s.start), '-i', full,
      '-frames:v', String(s.frames),
      '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-an',
      path.join(outDir, s.file),
    ]);
    console.log('sahne', s.file, `${s.duration.toFixed(2)}s`);
  }
}

await puppeteerInstance.close({silent: true});
console.log('bitti →', outDir);
