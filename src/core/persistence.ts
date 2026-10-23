import { strFromU8, strToU8, unzip, zip } from 'fflate';
import type { Asset, Project } from './types';

// Kalıcı kayıt: proje JSON'u ve medya dosyaları tarayıcının IndexedDB'sinde tutulur.

const DB_NAME = 'klip-studio';
const PROJECT_KEY = 'current';
const FORMAT_VERSION = 1;

type StoredAsset = Omit<Asset, 'url'>;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('assets', { keyPath: 'id' });
      request.result.createObjectStore('projects');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = work(db.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const toStored = ({ url: _url, ...rest }: Asset): StoredAsset => rest;
const fromStored = (asset: StoredAsset): Asset => ({ ...asset, url: URL.createObjectURL(asset.file) });

export const saveAsset = (asset: Asset) => run('assets', 'readwrite', (s) => s.put(toStored(asset)));
export const saveProject = (project: Project) => run('projects', 'readwrite', (s) => s.put(project, PROJECT_KEY));

export async function loadSession(): Promise<{ project: Project; assets: Record<string, Asset> } | null> {
  const project = await run<Project | undefined>('projects', 'readonly', (s) => s.get(PROJECT_KEY));
  if (!project) return null;
  const stored = await run<StoredAsset[]>('assets', 'readonly', (s) => s.getAll());
  const assets = Object.fromEntries(stored.map((a) => [a.id, fromStored(a)]));
  return { project, assets };
}

export async function clearSession() {
  await run('projects', 'readwrite', (s) => s.clear());
  await run('assets', 'readwrite', (s) => s.clear());
}

// .klip dosyası: proje JSON'u + varlık bilgileri + medya dosyalarından oluşan bir zip arşivi.
export async function exportKlip(project: Project, assets: Record<string, Asset>): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const meta = Object.values(assets).map(({ url: _url, file, ...rest }) => ({ ...rest, type: file.type }));
  files['project.json'] = strToU8(JSON.stringify({ version: FORMAT_VERSION, project, assets: meta }, null, 2));
  for (const asset of Object.values(assets)) files[`media/${asset.id}`] = new Uint8Array(await asset.file.arrayBuffer());
  const data = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, { level: 0 }, (error, out) => (error ? reject(error) : resolve(out))),
  );
  return new Blob([data as BlobPart], { type: 'application/zip' });
}

export async function importKlip(file: Blob): Promise<{ project: Project; assets: Record<string, Asset> }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(bytes, (error, out) => (error ? reject(error) : resolve(out))),
  );
  if (!files['project.json']) throw new Error('Geçersiz .klip dosyası');
  const parsed = JSON.parse(strFromU8(files['project.json'])) as {
    version: number;
    project: Project;
    assets: (Omit<Asset, 'url' | 'file'> & { type: string })[];
  };
  if (parsed.version > FORMAT_VERSION) throw new Error('Bu proje daha yeni bir sürümle kaydedilmiş');
  const assets: Record<string, Asset> = {};
  for (const { type, ...meta } of parsed.assets) {
    const data = files[`media/${meta.id}`];
    if (!data) continue;
    const blob = new Blob([data as BlobPart], { type });
    // JSON, görsellerin sonsuz süresini (Infinity) null yapar; geri çevir.
    const duration = meta.kind === 'image' ? Infinity : meta.duration;
    assets[meta.id] = { ...meta, duration, file: blob, url: URL.createObjectURL(blob) };
  }
  return { project: parsed.project, assets };
}
