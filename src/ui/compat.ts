// Editörün ihtiyaç duyduğu tarayıcı özelliklerinden eksik olanları döndürür.
export function missingFeatures(): string[] {
  const missing: string[] = [];
  if (!document.createElement('canvas').getContext('webgl2')) missing.push('WebGL2 (önizleme)');
  if (!('VideoEncoder' in window)) missing.push('WebCodecs (dışa aktarma)');
  if (!('indexedDB' in window)) missing.push('IndexedDB (otomatik kayıt)');
  return missing;
}
