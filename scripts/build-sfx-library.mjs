// Builds the bundled sound effect library (public/sfx) from a folder of real recordings.
// Usage: node scripts/build-sfx-library.mjs <library dir with CREDITS.csv> [--ban taste.json]
// The folder holds <category>/<file> and a CREDITS.csv (file,title,author,url,license,duration,...).
// Whooshes get a gentle low-pass (5.5 kHz) so transitions don't sound harsh.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [libraryDir, ...rest] = process.argv.slice(2);
if (!libraryDir) throw new Error('Usage: node scripts/build-sfx-library.mjs <library dir> [--ban taste.json]');
const banFile = rest[rest.indexOf('--ban') + 1];
const banned = new Set(rest.includes('--ban') ? JSON.parse(readFileSync(banFile, 'utf8')).ban.map((f) => path.resolve(f)) : []);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') cell += text[++i];
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const SOFTEN = new Set(['whoosh']);

// "soft_swoosh_with_noisy_ambience.wav" → "Soft swoosh with noisy ambience"
function cleanTitle(title) {
  const text = title
    .replace(/\.(wav|mp3|aiff?|flac|ogg)$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const outDir = path.resolve('public/sfx');
// Sound packs (scripts/build-sfx-pack.mjs) live next to the library and are kept.
const KEEP = new Set(['packs', 'packs.json']);
if (existsSync(outDir)) for (const entry of readdirSync(outDir)) if (!KEEP.has(entry)) rmSync(path.join(outDir, entry), { recursive: true, force: true });

const sounds = [];
for (const row of parseCsv(readFileSync(path.join(libraryDir, 'CREDITS.csv'), 'utf8'))) {
  const source = path.resolve(libraryDir, row.file);
  if (banned.has(source) || !existsSync(source)) continue;
  const category = row.file.split('/')[0];
  const base = path.basename(row.file).replace(/\.[^.]+$/, '');
  const id = `${category}/${base}`.toLowerCase().replace(/[^a-z0-9/]+/g, '_');
  const file = `${id}.mp3`;
  mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  if (SOFTEN.has(category) || !source.endsWith('.mp3')) {
    const filter = SOFTEN.has(category) ? ['-af', 'lowpass=f=5500'] : [];
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, ...filter, '-c:a', 'libmp3lame', '-q:a', '2', path.join(outDir, file)]);
  } else copyFileSync(source, path.join(outDir, file));
  sounds.push({
    id,
    name: cleanTitle(row.title),
    category,
    file,
    duration: Math.round(Number(row.duration) * 1000) / 1000,
    author: row.author,
    url: row.url,
    license: row.license,
  });
}
sounds.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(sounds, null, 1) + '\n');

const credits = [
  '# Sound effect credits',
  '',
  'Real recordings from [Freesound](https://freesound.org), all CC0 1.0 (public domain): free for any use, no attribution required. Listed here anyway, with thanks.',
  '',
  '| Sound | Author | Source |',
  '| --- | --- | --- |',
  ...sounds.map((s) => `| ${s.name.replace(/\|/g, '/')} | ${s.author} | ${s.url} |`),
  '',
];
writeFileSync(path.join(outDir, 'CREDITS.md'), credits.join('\n'));
console.log(`${sounds.length} sounds → ${outDir}`);
