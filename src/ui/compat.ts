// Returns the browser features the editor needs that are missing.
export function missingFeatures(): string[] {
  const missing: string[] = [];
  if (!document.createElement('canvas').getContext('webgl2')) missing.push('WebGL2 (preview)');
  if (!('VideoEncoder' in window)) missing.push('WebCodecs (export)');
  if (!('indexedDB' in window)) missing.push('IndexedDB (autosave)');
  return missing;
}
