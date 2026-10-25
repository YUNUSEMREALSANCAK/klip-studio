import type { CustomEffect, EffectParams } from '../core/types';
import { layerFragment, QUAD_VERTEX } from './shaders';

// Custom transitions and filters are GLSL ES 3.0 snippets written by the user or an AI agent.
// They run only on the GPU, inside the same pipeline as the built-in effects, so preview and export match.

const PARAMS_API =
  'Adjustable parameters: declare `uniform float strength; // = 1.0 [0, 3]` (default and slider range) or `uniform vec3 tint; // = vec3(1.0, 0.5, 0.2)` (color picker); each gets a control in the editor.';

export const TRANSITION_API = `GLSL ES 3.0, compatible with gl-transitions.com. Define \`vec4 transition(vec2 uv)\`. Available: \`vec4 getFromColor(vec2 uv)\` (outgoing clip), \`vec4 getToColor(vec2 uv)\` (incoming clip), \`float progress\` (0 → 1, eased by the cut's easing), \`float ratio\` (width / height), \`vec2 resolution\` (pixels). uv runs 0..1 with (0,0) at the bottom left. ${PARAMS_API}`;

export const FILTER_API = `GLSL ES 3.0. Define \`vec4 effect(vec4 color, vec2 uv)\` and return the new color. \`color\` is the clip pixel at uv (0..1, (0,0) at the bottom left), before the clip's color adjustments. Available: \`vec4 getColor(vec2 uv)\` (any source pixel), \`float time\` (seconds since the clip starts, for animated effects), \`vec2 resolution\` (source pixels). The result is mixed with the original by the clip's effect amount, which also fades in and out. ${PARAMS_API}`;

export const TRANSITION_TEMPLATE = `// Diagonal wipe with a soft edge
uniform float softness; // = 0.1 [0, 0.5]

vec4 transition(vec2 uv) {
  float d = (uv.x + uv.y) * 0.5;
  float m = smoothstep(progress * (1.0 + softness) - softness, progress * (1.0 + softness), d);
  return mix(getToColor(uv), getFromColor(uv), m);
}
`;

export const FILTER_TEMPLATE = `// Duotone: shadows and highlights mapped to two colors
uniform vec3 shadows; // = vec3(0.10, 0.12, 0.35)
uniform vec3 highlights; // = vec3(1.00, 0.72, 0.42)

vec4 effect(vec4 color, vec2 uv) {
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  return vec4(mix(shadows, highlights, luma), color.a);
}
`;

const MAX_CODE_LENGTH = 20_000;

export interface EffectParam {
  name: string;
  type: 'float' | 'color';
  default: number | number[];
  min: number;
  max: number;
}

const PARAM = /^\s*uniform\s+(float|vec3)\s+(\w+)\s*;\s*\/\/\s*=\s*(.+?)\s*$/gm;
const paramCache = new Map<string, EffectParam[]>();

// Adjustable parameters declared in the code: `uniform float x; // = 1.0 [0, 3]` and `uniform vec3 c; // = vec3(r, g, b)`.
export function effectParams(code: string): EffectParam[] {
  if (!paramCache.has(code)) {
    const params: EffectParam[] = [];
    for (const [, type, name, spec] of code.matchAll(PARAM)) {
      if (type === 'vec3') {
        const rgb = spec
          .match(/vec3\s*\(([^)]*)\)/)?.[1]
          .split(',')
          .map(Number);
        if (rgb?.length === 3 && rgb.every(Number.isFinite)) params.push({ name, type: 'color', default: rgb, min: 0, max: 1 });
        continue;
      }
      const value = parseFloat(spec);
      if (!Number.isFinite(value)) continue;
      const range = spec.match(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
      const [min, max] = range ? [Number(range[1]), Number(range[2])] : [Math.min(0, value), Math.max(1, value * 2)];
      params.push({ name, type: 'float', default: value, min, max });
    }
    paramCache.set(code, params);
  }
  return paramCache.get(code)!;
}

// Each parameter with its value: the clip's own setting, or the default from the code.
export const paramValues = (code: string, values: EffectParams = {}) => effectParams(code).map((p) => ({ ...p, value: values[p.name] ?? p.default }));

// gl-transitions also declare other types as `uniform vec2 center; // = vec2(0.5)`; those become constants.
export function inlineUniformDefaults(code: string) {
  return code.replace(/^\s*uniform\s+(int|bool|vec2|vec4|ivec2)\s+(\w+)\s*;\s*\/\/\s*=\s*([^;\n]+);?.*$/gm, 'const $1 $2 = $1($3);');
}

export function transitionFragment(code: string) {
  return `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float progress;
uniform float ratio;
uniform vec2 resolution;
#define texture2D texture
vec4 getFromColor(vec2 uv) { return texture(uFrom, uv); }
vec4 getToColor(vec2 uv) { return texture(uTo, uv); }
#line 1
${inlineUniformDefaults(code)}
void main() { outColor = transition(vUv); }`;
}

export const filterFragment = (code: string) => layerFragment(inlineUniformDefaults(code));

export const effectFragment = (effect: Pick<CustomEffect, 'kind' | 'code'>) =>
  effect.kind === 'transition' ? transitionFragment(effect.code) : filterFragment(effect.code);

let probe: WebGL2RenderingContext | null = null;

// Compiles the effect on a throwaway context. Returns null when it's valid, otherwise the GLSL error log
// (line numbers refer to the user's code).
export function validateEffect(effect: Pick<CustomEffect, 'kind' | 'code'>): string | null {
  if (!effect.code.trim()) return 'The code is empty';
  if (effect.code.length > MAX_CODE_LENGTH) return `The code is too long (max ${MAX_CODE_LENGTH} characters)`;
  const entry = effect.kind === 'transition' ? /vec4\s+transition\s*\(\s*vec2/ : /vec4\s+effect\s*\(\s*vec4\s+\w+\s*,\s*vec2/;
  if (!entry.test(effect.code)) {
    return effect.kind === 'transition' ? 'Define vec4 transition(vec2 uv)' : 'Define vec4 effect(vec4 color, vec2 uv)';
  }
  probe ??= new OffscreenCanvas(4, 4).getContext('webgl2');
  if (!probe) return null;
  const gl = probe;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const log = gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? null : (gl.getShaderInfoLog(shader) ?? 'Compile error');
    return { shader, log };
  };
  const vertex = compile(gl.VERTEX_SHADER, QUAD_VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, effectFragment(effect));
  let error = fragment.log;
  if (!error) {
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex.shader);
    gl.attachShader(program, fragment.shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) error = gl.getProgramInfoLog(program) ?? 'Link error';
    gl.deleteProgram(program);
  }
  gl.deleteShader(vertex.shader);
  gl.deleteShader(fragment.shader);
  return error?.replace(/\0/g, '').trim() || null;
}
