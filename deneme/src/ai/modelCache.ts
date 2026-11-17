// Downloads large ONNX models once and keeps them in the browser's Cache Storage.
const CACHE = 'klip-models';

export async function cachedModel(url: string, onProgress: (progress: number) => void): Promise<Uint8Array> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error('Model indirilemedi');
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) onProgress(loaded / total);
  }
  const blob = new Blob(chunks as BlobPart[]);
  await cache.put(url, new Response(blob));
  return new Uint8Array(await blob.arrayBuffer());
}
