import type { CustomEffect } from '../core/types';

// Built-in video effects and extra transitions, written against the custom effect API (src/render/effects.ts).
// Using one is the same as adding a custom effect with the id `lib_<key>`, so it stays editable and travels with the project.

export interface LibraryEffect {
  key: string;
  name: string;
  kind: CustomEffect['kind'];
  code: string;
}

const HASH =
  'float hash(float n) { return fract(sin(n) * 43758.5453); }\nfloat hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n';

const FILTERS: Omit<LibraryEffect, 'kind'>[] = [
  {
    key: 'glitch',
    name: 'Glitch',
    code: `${HASH}
vec4 effect(vec4 color, vec2 uv) {
  float t = floor(time * 12.0);
  float burst = step(0.55, hash(t));
  float row = floor(uv.y * 24.0);
  vec2 p = uv + vec2((hash(row + t * 7.0) - 0.5) * 0.08 * burst, 0.0);
  float split = 0.006 + 0.02 * burst;
  return vec4(getColor(p + vec2(split, 0.0)).r, getColor(p).g, getColor(p - vec2(split, 0.0)).b, color.a);
}`,
  },
  {
    key: 'shake',
    name: 'Shake',
    code: `vec4 effect(vec4 color, vec2 uv) {
  vec2 offset = vec2(sin(time * 37.0) + sin(time * 61.0), cos(time * 29.0) + sin(time * 53.0)) * 0.006;
  return getColor(0.5 + (uv - 0.5) * 0.94 + offset);
}`,
  },
  {
    key: 'vhs',
    name: 'VHS',
    code: `${HASH}
vec4 effect(vec4 color, vec2 uv) {
  vec2 p = uv + vec2(sin(uv.y * 40.0 + time * 6.0) * 0.0015, 0.0);
  vec3 c = vec3(getColor(p + vec2(0.004, 0.0)).r, getColor(p).g, getColor(p - vec2(0.004, 0.0)).b);
  c *= 0.9 + 0.1 * sin(uv.y * resolution.y * 1.5);
  c += (hash2(uv * resolution + time) - 0.5) * 0.08;
  c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.25) * vec3(1.05, 0.98, 1.08);
  return vec4(c, color.a);
}`,
  },
  {
    key: 'rgb_split',
    name: 'RGB split',
    code: `vec4 effect(vec4 color, vec2 uv) {
  vec2 d = vec2(0.008 + 0.006 * sin(time * 3.0), 0.0);
  return vec4(getColor(uv + d).r, color.g, getColor(uv - d).b, color.a);
}`,
  },
  {
    key: 'film_grain',
    name: 'Film grain',
    code: `${HASH}
vec4 effect(vec4 color, vec2 uv) {
  float grain = hash2(floor(uv * resolution * 0.5) + floor(time * 24.0)) - 0.5;
  return vec4(color.rgb + grain * 0.12, color.a);
}`,
  },
  {
    key: 'old_film',
    name: 'Old film',
    code: `${HASH}
vec4 effect(vec4 color, vec2 uv) {
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 c = vec3(luma) * vec3(1.07, 0.93, 0.74);
  float frame = floor(time * 18.0);
  c += (hash2(floor(uv * resolution * 0.5) + frame) - 0.5) * 0.1;
  c *= 0.92 + 0.08 * hash(frame);
  float scratch = step(0.997, hash(floor(uv.x * 300.0) + frame * 3.0)) * step(0.4, hash(frame));
  c = mix(c, vec3(0.9), scratch * 0.6);
  c *= 1.0 - smoothstep(0.35, 0.8, distance(uv, vec2(0.5)));
  return vec4(c, color.a);
}`,
  },
  {
    key: 'zoom_pulse',
    name: 'Zoom pulse',
    code: `vec4 effect(vec4 color, vec2 uv) {
  float scale = 1.0 + 0.07 * pow(abs(sin(time * 3.14159)), 4.0);
  return getColor(0.5 + (uv - 0.5) / scale);
}`,
  },
  {
    key: 'flash',
    name: 'Flash in',
    code: `vec4 effect(vec4 color, vec2 uv) {
  return vec4(mix(color.rgb, vec3(1.0), exp(-time * 6.0)), color.a);
}`,
  },
  {
    key: 'focus_in',
    name: 'Focus in',
    code: `vec4 effect(vec4 color, vec2 uv) {
  float radius = max(0.0, 1.0 - time) * 0.012;
  if (radius <= 0.0) return color;
  vec4 sum = vec4(0.0);
  for (int x = -2; x <= 2; x++)
    for (int y = -2; y <= 2; y++) sum += getColor(uv + vec2(float(x), float(y)) * radius);
  return sum / 25.0;
}`,
  },
  {
    key: 'mirror',
    name: 'Mirror',
    code: `vec4 effect(vec4 color, vec2 uv) {
  return getColor(vec2(uv.x < 0.5 ? uv.x : 1.0 - uv.x, uv.y));
}`,
  },
  {
    key: 'kaleidoscope',
    name: 'Kaleidoscope',
    code: `vec4 effect(vec4 color, vec2 uv) {
  vec2 p = uv - 0.5;
  float angle = atan(p.y, p.x) + time * 0.3;
  float slice = 6.2831853 / 6.0;
  angle = abs(mod(angle, slice) - slice * 0.5);
  return getColor(0.5 + vec2(cos(angle), sin(angle)) * length(p));
}`,
  },
  {
    key: 'light_leak',
    name: 'Light leak',
    code: `vec4 effect(vec4 color, vec2 uv) {
  vec2 center = vec2(0.15 + 0.7 * (0.5 + 0.5 * sin(time * 0.7)), 0.75);
  float glow = exp(-distance(uv, center) * 3.5);
  vec3 leak = vec3(1.0, 0.55, 0.25) * glow * 0.9;
  return vec4(1.0 - (1.0 - color.rgb) * (1.0 - leak), color.a);
}`,
  },
  {
    key: 'pixelate',
    name: 'Pixelate',
    code: `vec4 effect(vec4 color, vec2 uv) {
  vec2 cells = resolution / 24.0;
  return getColor((floor(uv * cells) + 0.5) / cells);
}`,
  },
];

const TRANSITIONS: Omit<LibraryEffect, 'kind'>[] = [
  {
    key: 'dissolve',
    name: 'Dissolve',
    code: `float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 transition(vec2 uv) {
  float n = hash2(floor(uv * resolution / 4.0));
  return mix(getFromColor(uv), getToColor(uv), step(n, progress));
}`,
  },
  {
    key: 'swirl',
    name: 'Swirl',
    code: `vec4 transition(vec2 uv) {
  vec2 p = uv - 0.5;
  float strength = sin(progress * 3.14159) * 6.0;
  float angle = strength * (0.5 - length(p));
  float s = sin(angle), c = cos(angle);
  vec2 q = 0.5 + vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  return mix(getFromColor(q), getToColor(q), smoothstep(0.3, 0.7, progress));
}`,
  },
  {
    key: 'ripple',
    name: 'Ripple',
    code: `vec4 transition(vec2 uv) {
  vec2 dir = uv - 0.5;
  float dist = length(dir);
  vec2 offset = dir * sin(dist * 60.0 - progress * 40.0) * 0.03 * sin(progress * 3.14159);
  return mix(getFromColor(uv + offset), getToColor(uv + offset), smoothstep(0.2, 0.8, progress));
}`,
  },
  {
    key: 'zoom_blur',
    name: 'Zoom blur',
    code: `vec4 transition(vec2 uv) {
  float strength = sin(progress * 3.14159) * 0.3;
  vec4 from = vec4(0.0), to = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    vec2 p = 0.5 + (uv - 0.5) * (1.0 - strength * float(i) / 12.0);
    from += getFromColor(p);
    to += getToColor(p);
  }
  return mix(from / 12.0, to / 12.0, smoothstep(0.35, 0.65, progress));
}`,
  },
  {
    key: 'glitch',
    name: 'Glitch',
    code: `float hash(float n) { return fract(sin(n) * 43758.5453); }
vec4 transition(vec2 uv) {
  float strength = sin(progress * 3.14159);
  float row = floor(uv.y * 20.0);
  float t = floor(progress * 20.0);
  vec2 p = uv + vec2((hash(row + t) - 0.5) * 0.3 * strength, 0.0);
  vec4 a = vec4(getFromColor(p + vec2(0.02 * strength, 0.0)).r, getFromColor(p).g, getFromColor(p - vec2(0.02 * strength, 0.0)).b, 1.0);
  vec4 b = vec4(getToColor(p + vec2(0.02 * strength, 0.0)).r, getToColor(p).g, getToColor(p - vec2(0.02 * strength, 0.0)).b, 1.0);
  return mix(a, b, step(hash(row * 3.0 + t), progress));
}`,
  },
  {
    key: 'burn',
    name: 'Burn',
    code: `float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + 1.0), f.x), f.y);
}
vec4 transition(vec2 uv) {
  float n = noise(uv * vec2(ratio, 1.0) * 6.0) * 0.7 + noise(uv * 20.0) * 0.3;
  float edge = progress * 1.2 - 0.1;
  float t = smoothstep(edge - 0.06, edge, n);
  vec3 fire = vec3(1.0, 0.45, 0.1) * (1.0 - smoothstep(0.0, 0.06, abs(n - edge + 0.03)));
  return vec4(mix(getToColor(uv).rgb, getFromColor(uv).rgb, t) + fire, 1.0);
}`,
  },
  {
    key: 'squares',
    name: 'Squares',
    code: `float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 transition(vec2 uv) {
  vec2 cell = floor(uv * vec2(10.0 * ratio, 10.0));
  float delay = hash2(cell) * 0.6;
  float local = clamp((progress - delay) / 0.4, 0.0, 1.0);
  return mix(getFromColor(uv), getToColor(uv), local);
}`,
  },
  {
    key: 'doors',
    name: 'Doors open',
    code: `vec4 transition(vec2 uv) {
  float half_ = (1.0 - progress) * 0.5;
  if (uv.x < half_) return getFromColor(vec2(uv.x + 0.5 - half_, uv.y));
  if (uv.x > 1.0 - half_) return getFromColor(vec2(uv.x - 0.5 + half_, uv.y));
  return getToColor(0.5 + (uv - 0.5) * (0.85 + 0.15 * progress));
}`,
  },
  {
    key: 'flash',
    name: 'Flash',
    code: `vec4 transition(vec2 uv) {
  vec4 base = mix(getFromColor(uv), getToColor(uv), step(0.5, progress));
  return mix(base, vec4(1.0), pow(1.0 - abs(progress - 0.5) * 2.0, 3.0));
}`,
  },
];

export const EFFECT_LIBRARY: LibraryEffect[] = [
  ...FILTERS.map((e) => ({ ...e, kind: 'filter' as const })),
  ...TRANSITIONS.map((e) => ({ ...e, kind: 'transition' as const })),
];

export const LIBRARY_PREFIX = 'lib_';
export const libraryId = (effect: LibraryEffect) => `${LIBRARY_PREFIX}${effect.kind === 'transition' ? 't_' : ''}${effect.key}`;
export const libraryEffect = (id: string) => EFFECT_LIBRARY.find((e) => libraryId(e) === id);
export const isLibraryId = (id: string) => id.startsWith(LIBRARY_PREFIX);
