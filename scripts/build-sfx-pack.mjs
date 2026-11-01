// Adds a sound pack (the finished sounds of one video, with clear names) to public/sfx/packs.
// Usage: node scripts/build-sfx-pack.mjs <pack.json> <clips dir>
// pack.json: { id, title, description, sounds: [{ name, category, use, moment, clips: ["sfx_001_click.wav", ...] }] }
// Clips come from real-sfx (`mix.py --export-clips`) with their levels baked in; several clips in one sound
// are mixed at their original offsets (e.g. twelve keystrokes become one "typing" sound).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [specFile, clipsDir] = process.argv.slice(2);
if (!specFile || !clipsDir) throw new Error('Usage: node scripts/build-sfx-pack.mjs <pack.json> <clips dir>');
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const timing = Object.fromEntries(JSON.parse(readFileSync(path.join(clipsDir, 'sfx_clips.json'), 'utf8')).map((c) => [c.file, c]));

const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[çğıöşü]/g, (ch) => TR[ch])
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const outDir = path.resolve('public/sfx/packs', spec.id);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const probeDuration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

const sounds = spec.sounds.map((s) => {
  const file = `packs/${spec.id}/${slug(s.name)}.mp3`;
  const inputs = s.clips.map((c) => path.join(clipsDir, c));
  const first = timing[s.clips[0]].start;
  const args = ['-v', 'error', '-y', ...inputs.flatMap((f) => ['-i', f])];
  if (inputs.length > 1) {
    const delays = s.clips.map((c, i) => `[${i}:a]adelay=${Math.round((timing[c].start - first) * 1000)}:all=1[d${i}]`);
    const mix = `${s.clips.map((_, i) => `[d${i}]`).join('')}amix=inputs=${inputs.length}:normalize=0:duration=longest[out]`;
    args.push('-filter_complex', [...delays, mix].join(';'), '-map', '[out]');
  }
  const target = path.resolve('public/sfx', file);
  execFileSync('ffmpeg', [...args, '-c:a', 'libmp3lame', '-q:a', '2', target]);
  return {
    id: `${spec.id}/${slug(s.name)}`,
    name: s.name,
    category: s.category,
    file,
    duration: Math.round(probeDuration(target) * 1000) / 1000,
    author: 'Fityazılım (CC0 recordings from Freesound, processed)',
    url: '',
    license: 'CC0 1.0',
    use: s.use,
    moment: s.moment,
  };
});

const packsFile = path.resolve('public/sfx/packs.json');
const packs = existsSync(packsFile) ? JSON.parse(readFileSync(packsFile, 'utf8')).filter((p) => p.id !== spec.id) : [];
packs.push({ id: spec.id, title: spec.title, description: spec.description, sounds });
writeFileSync(packsFile, JSON.stringify(packs, null, 1) + '\n');
console.log(`${sounds.length} sounds → ${outDir}`);
