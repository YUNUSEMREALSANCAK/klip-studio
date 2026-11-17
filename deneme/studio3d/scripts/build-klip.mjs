// Builds a Klip Stüdyo project (.klip) from a reel's rendered parts, so the reel can be edited piece by piece:
//   main track    the 3D scenes (out/<reel>/sahneler, from render-parts.mjs)
//   overlay track every label / chapter tag / end card as its own transparent video (out/<reel>/katman)
//   audio track   the voice-over + every sound effect as its own clip (real-sfx --export-clips), ducked under speech
// Usage: node scripts/build-klip.mjs <reel> --voice <audio> --sfx <dir with sfx_clips.json> --out <file.klip>
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';

// fflate comes from Klip Stüdyo itself (the folder above), so the archive matches what the editor writes.
const {zipSync} = createRequire(path.resolve('../package.json'))('fflate');

const reel = process.argv[2];
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const voice = arg('voice');
const sfxDir = arg('sfx');
const outFile = arg('out');
if (!reel || !voice || !outFile) throw new Error('Usage: node scripts/build-klip.mjs <reel> --voice <audio> [--sfx <dir>] --out <file.klip>');

const partsDir = path.resolve('out', reel);
const parts = JSON.parse(readFileSync(path.join(partsDir, 'parts.json'), 'utf8'));

const MIME = {'.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav'};
const DEFAULT_FILTER = {brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, sharpen: 0, grayscale: false, lutIntensity: 1, effectAmount: 1};
const uid = () => randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
const round = (n) => Math.round(n * 1000) / 1000;

const probe = (file) => {
  const out = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file]).toString());
  const video = out.streams.find((s) => s.codec_type === 'video');
  return {duration: Number(out.format.duration), width: video?.width ?? 0, height: video?.height ?? 0, hasAudio: out.streams.some((s) => s.codec_type === 'audio')};
};

// Same thumbnail the editor makes on import: 160×90, cropped to fill, as a JPEG data URL.
const thumbnail = (file, at) => {
  const decoder = file.endsWith('.webm') ? ['-c:v', 'libvpx-vp9'] : [];
  const jpeg = execFileSync('ffmpeg', ['-v', 'error', ...decoder, '-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'scale=160:90:force_original_aspect_ratio=increase,crop=160:90', '-f', 'image2', '-c:v', 'mjpeg', '-q:v', '5', '-']);
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

const files = {};
const assets = [];
const clips = [];

function addAsset(file, name) {
  const info = probe(file);
  const id = uid();
  const kind = info.width ? 'video' : 'audio';
  const meta = {id, name, kind, duration: info.duration, width: info.width, height: info.height, hasAudio: info.hasAudio, type: MIME[path.extname(file)]};
  if (kind === 'video') meta.thumbnail = thumbnail(file, Math.min(0.5, info.duration / 2));
  assets.push(meta);
  files[`media/${id}`] = readFileSync(file);
  return meta;
}

function addClip(asset, track, start, extra = {}) {
  const clip = {
    id: uid(),
    type: 'media',
    track,
    assetId: asset.id,
    start: round(start),
    in: 0,
    duration: round(Math.min(extra.duration ?? asset.duration, asset.duration)),
    volume: 1,
    muted: false,
    filter: {...DEFAULT_FILTER},
    removeBackground: false,
    transform: {x: 0.5, y: 0.5, scale: 1, rotation: 0},
    speed: 1,
    opacity: 1,
    keyframes: [],
    fadeIn: 0,
    fadeOut: 0,
    duck: false,
    ...extra,
  };
  clips.push(clip);
  return clip;
}

// Scenes sit back to back on the magnetic main track; the cross-fades are inside the renders.
for (const scene of parts.scenes) {
  const asset = addAsset(path.join(partsDir, scene.file), `${path.basename(scene.file, '.mp4')}.mp4`);
  addClip(asset, 'main', scene.start, {duration: scene.duration});
}

for (const layer of parts.layers) {
  const asset = addAsset(path.join(partsDir, layer.file), `${layer.name}.webm`);
  addClip(asset, 'overlay', layer.start, {duration: layer.duration, blend: 'normal'});
}

addClip(addAsset(path.resolve(voice), `Seslendirme${path.extname(voice)}`), 'audio', 0);

if (sfxDir) {
  // Gains are baked into each clip; duck lowers them under the voice like the original mix did.
  const sfx = JSON.parse(readFileSync(path.join(sfxDir, 'sfx_clips.json'), 'utf8'));
  for (const s of sfx) {
    const source = path.basename(s.source_file).replace(/_\d+(_[\d_]+)?\.(mp3|wav)$/i, '').replace(/_/g, ' ');
    const asset = addAsset(path.join(sfxDir, s.file), `${s.id} ${s.role} · ${source}.wav`);
    addClip(asset, 'audio', s.start, {duration: s.duration, duck: true});
  }
}

const project = {
  aspect: '9:16',
  fps: parts.fps,
  background: '#020611',
  backgroundBlur: false,
  clips,
  markers: parts.layers.filter((l) => l.id.startsWith('chapter-')).map((l) => round(l.start + 0.1)),
  luts: {},
  effects: {},
  fonts: {},
};
files['project.json'] = Buffer.from(JSON.stringify({version: 1, project, assets}, null, 2));
writeFileSync(path.resolve(outFile), zipSync(files, {level: 0}));

const count = (track) => clips.filter((c) => c.track === track).length;
console.log(`${outFile}: ${count('main')} sahne, ${count('overlay')} katman, ${count('audio')} ses (${assets.length} dosya)`);
