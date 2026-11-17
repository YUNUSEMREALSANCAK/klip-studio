import { uid } from '../core/timeline';
import type { Lut } from '../core/types';

// Parses an Adobe/Resolve .cube 3D LUT; stores the data as base64 RGB bytes.
export function parseCube(text: string, name: string): Lut {
  let size = 0;
  let min = [0, 0, 0];
  let max = [1, 1, 1];
  const values: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('TITLE')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'LUT_3D_SIZE') size = Number(parts[1]);
    else if (parts[0] === 'DOMAIN_MIN') min = parts.slice(1, 4).map(Number);
    else if (parts[0] === 'DOMAIN_MAX') max = parts.slice(1, 4).map(Number);
    else if (parts[0] === 'LUT_1D_SIZE') throw new Error('1D LUTs are not supported; choose a 3D .cube file');
    else if (/^[-\d.]/.test(parts[0])) values.push(...parts.slice(0, 3).map(Number));
  }
  if (!size || values.length !== size ** 3 * 3) throw new Error('Invalid .cube file');
  let binary = '';
  for (let i = 0; i < values.length; i++) {
    const c = i % 3;
    const normalized = (values[i] - min[c]) / (max[c] - min[c]);
    binary += String.fromCharCode(Math.round(Math.min(Math.max(normalized, 0), 1) * 255));
  }
  return { id: uid(), name: name.replace(/\.cube$/i, ''), size, data: btoa(binary) };
}
