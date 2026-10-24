import type { CustomEffect } from '../core/types';
import { layerFragment, QUAD_VERTEX } from './shaders';

// Custom transitions and filters are GLSL ES 3.0 snippets written by the user or an AI agent.
// They run only on the GPU, inside the same pipeline as the built-in effects, so preview and export match.

export const TRANSITION_API =
  'GLSL ES 3.0, compatible with gl-transitions.com. Define `vec4 transition(vec2 uv)`. Available: `vec4 getFromColor(vec2 uv)` (outgoing clip), `vec4 getToColor(vec2 uv)` (incoming clip), `float progress` (0 → 1), `float ratio` (width / height), `vec2 resolution` (pixels). uv runs 0..1 with (0,0) at the bottom left. Use constants for parameters; `uniform float x; // = 1.0` is turned into a constant.';

export const FILTER_API =
  "GLSL ES 3.0. Define `vec4 effect(vec4 color, vec2 uv)` and return the new color. `color` is the clip pixel at uv (0..1, (0,0) at the bottom left), before the clip's color adjustments. Available: `vec4 getColor(vec2 uv)` (any source pixel), `float time` (seconds since the clip starts, for animated effects), `vec2 resolution` (source pixels). The result is mixed with the original by the clip's effect amount.";

export const TRANSITION_TEMPLATE = `// Diagonal wipe with a soft edge
vec4 transition(vec2 uv) {
  float edge = 0.1;
  float d = (uv.x + uv.y) * 0.5;
  float m = smoothstep(progress * (1.0 + edge) - edge, progress * (1.0 + edge), d);
  return mix(getToColor(uv), getFromColor(uv), m);
}
`;

export const FILTER_TEMPLATE = `// Duotone: shadows to deep blue, highlights to warm orange
vec4 effect(vec4 color, vec2 uv) {
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 shadows = vec3(0.10, 0.12, 0.35);
  vec3 highlights = vec3(1.00, 0.72, 0.42);
  return vec4(mix(shadows, highlights, luma), color.a);
}
`;

const MAX_CODE_LENGTH = 20_000;

// gl-transitions declare parameters as `uniform float amount; // = 0.5`; turn those into constants.
export function inlineUniformDefaults(code: string) {
  return code.replace(/^\s*uniform\s+(float|int|bool|vec2|vec3|vec4|ivec2)\s+(\w+)\s*;\s*\/\/\s*=\s*([^;\n]+);?.*$/gm, 'const $1 $2 = $1($3);');
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

export const filterFragment = (code: string) => layerFragment(code);

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
