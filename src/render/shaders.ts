import type { TransitionType } from '../core/types';

export const QUAD_VERTEX = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const IDENTITY_EFFECT = 'vec4 effect(vec4 color, vec2 uv) { return color; }';

// Layer shader: source + blur + sharpen + custom filter + color adjustments + LUT + vignette
// + background matte + shape mask + chroma key. A custom filter (src/render/effects.ts) supplies effect().
export const layerFragment = (effectCode = IDENTITY_EFFECT) => /* glsl */ `#version 300 es
precision highp float;
precision mediump sampler3D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSource;
uniform sampler2D uMatte;
uniform mediump sampler3D uLut;
uniform bool uUseMatte;
uniform vec2 uTexel;
uniform float uBlur;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uVignette;
uniform float uSharpen;
uniform bool uGrayscale;
uniform float uLutIntensity;
uniform float uLutSize;
uniform float uOpacity;
uniform int uShape;
uniform vec4 uShapeRect;
uniform float uFeather;
uniform bool uShapeInvert;
uniform bool uChroma;
uniform vec2 uKey;
uniform float uSimilarity;
uniform float uSmoothness;
uniform float uEffectAmount;
uniform float time;
uniform vec2 resolution;

vec4 getColor(vec2 uv) { return texture(uSource, uv); }

vec2 klipChroma(vec3 c) {
  return vec2(-0.1687 * c.r - 0.3313 * c.g + 0.5 * c.b, 0.5 * c.r - 0.4187 * c.g - 0.0813 * c.b);
}

float klipShape(vec2 uv) {
  if (uShape == 0) return 1.0;
  vec2 p = uv - uShapeRect.xy;
  vec2 half_ = max(uShapeRect.zw * 0.5, vec2(1e-4));
  float f = max(uFeather, 0.001);
  float a;
  if (uShape == 1) a = 1.0 - smoothstep(1.0 - f, 1.0 + f, max(abs(p.x) / half_.x, abs(p.y) / half_.y));
  else if (uShape == 2) a = 1.0 - smoothstep(1.0 - f, 1.0 + f, length(p / half_));
  else a = smoothstep(-f * 0.5, f * 0.5, p.y);
  return uShapeInvert ? 1.0 - a : a;
}

#line 1
${effectCode}

void main() {
  vec4 color;
  if (uBlur > 0.0) {
    color = vec4(0.0);
    for (int x = -3; x <= 3; x++) {
      for (int y = -3; y <= 3; y++) color += texture(uSource, vUv + vec2(float(x), float(y)) * uTexel * uBlur);
    }
    color /= 49.0;
  } else {
    color = texture(uSource, vUv);
  }
  if (uSharpen > 0.0) {
    vec3 blur = texture(uSource, vUv + vec2(uTexel.x, 0.0)).rgb
      + texture(uSource, vUv - vec2(uTexel.x, 0.0)).rgb
      + texture(uSource, vUv + vec2(0.0, uTexel.y)).rgb
      + texture(uSource, vUv - vec2(0.0, uTexel.y)).rgb;
    color.rgb += (color.rgb - blur * 0.25) * uSharpen * 1.5;
  }
  vec4 original = color;
  if (uEffectAmount > 0.0) color = mix(color, effect(color, vUv), uEffectAmount);
  float alpha = color.a * uOpacity;
  if (uChroma) {
    float d = distance(klipChroma(original.rgb), uKey);
    alpha *= smoothstep(uSimilarity, uSimilarity + uSmoothness, d);
  }
  vec3 c = color.rgb + uBrightness * 0.3;
  c = (c - 0.5) * (1.0 + uContrast) + 0.5;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(luma), c, 1.0 + uSaturation);
  c += vec3(uTemperature * 0.08, uTemperature * 0.02, -uTemperature * 0.08);
  if (uLutIntensity > 0.0) {
    vec3 coord = clamp(c, 0.0, 1.0) * (uLutSize - 1.0) / uLutSize + 0.5 / uLutSize;
    c = mix(c, texture(uLut, coord).rgb, uLutIntensity);
  }
  if (uGrayscale) c = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
  float dist = distance(vUv, vec2(0.5));
  c *= 1.0 - uVignette * smoothstep(0.3, 0.75, dist);
  if (uUseMatte) alpha *= smoothstep(0.35, 0.65, texture(uMatte, vUv).r);
  alpha *= klipShape(vUv);
  outColor = vec4(clamp(c, 0.0, 1.0), alpha);
}`;

export const TRANSITION_TYPES: { type: TransitionType; label: string }[] = [
  { type: 'fade', label: 'Crossfade' },
  { type: 'fadeblack', label: 'Fade to black' },
  { type: 'slideleft', label: 'Slide left' },
  { type: 'slideright', label: 'Slide right' },
  { type: 'slideup', label: 'Slide up' },
  { type: 'wipeleft', label: 'Wipe left' },
  { type: 'wiperight', label: 'Wipe right' },
  { type: 'circleopen', label: 'Circle open' },
  { type: 'zoomin', label: 'Zoom in' },
  { type: 'pixelize', label: 'Pixelate' },
  { type: 'radial', label: 'Clock wipe' },
  { type: 'blur', label: 'Blur' },
];

export const TRANSITION_INDEX = Object.fromEntries(TRANSITION_TYPES.map((t, i) => [t.type, i])) as Record<TransitionType, number>;

// Same model as gl-transitions: two textures (outgoing/incoming) + 0→1 progress.
export const TRANSITION_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform int uType;
uniform vec2 uResolution;

vec4 getFrom(vec2 uv) { return texture(uFrom, uv); }
vec4 getTo(vec2 uv) { return texture(uTo, uv); }

vec4 blurred(sampler2D tex, vec2 uv, float radius) {
  vec4 sum = vec4(0.0);
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      sum += texture(tex, uv + vec2(float(x), float(y)) * radius);
    }
  }
  return sum / 25.0;
}

void main() {
  vec2 uv = vUv;
  float p = clamp(uProgress, 0.0, 1.0);
  float ease = p * p * (3.0 - 2.0 * p);
  vec4 color;
  if (uType == 0) {
    color = mix(getFrom(uv), getTo(uv), ease);
  } else if (uType == 1) {
    color = p < 0.5 ? mix(getFrom(uv), vec4(0.0, 0.0, 0.0, 1.0), p * 2.0)
                    : mix(vec4(0.0, 0.0, 0.0, 1.0), getTo(uv), (p - 0.5) * 2.0);
  } else if (uType == 2) {
    color = uv.x < 1.0 - ease ? getFrom(uv + vec2(ease, 0.0)) : getTo(uv - vec2(1.0 - ease, 0.0));
  } else if (uType == 3) {
    color = uv.x > ease ? getFrom(uv - vec2(ease, 0.0)) : getTo(uv + vec2(1.0 - ease, 0.0));
  } else if (uType == 4) {
    color = uv.y > ease ? getFrom(uv - vec2(0.0, ease)) : getTo(uv + vec2(0.0, 1.0 - ease));
  } else if (uType == 5) {
    float edge = smoothstep(ease - 0.04, ease + 0.04, 1.0 - uv.x);
    color = mix(getFrom(uv), getTo(uv), 1.0 - edge);
  } else if (uType == 6) {
    float edge = smoothstep(ease - 0.04, ease + 0.04, uv.x);
    color = mix(getFrom(uv), getTo(uv), 1.0 - edge);
  } else if (uType == 7) {
    vec2 centered = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float radius = ease * length(vec2(uResolution.x / uResolution.y, 1.0)) * 0.55;
    float inside = 1.0 - smoothstep(radius - 0.02, radius + 0.02, length(centered));
    color = mix(getFrom(uv), getTo(uv), inside);
  } else if (uType == 8) {
    vec4 from = getFrom(0.5 + (uv - 0.5) / (1.0 + ease * 0.8));
    vec4 to = getTo(0.5 + (uv - 0.5) * (1.0 + (1.0 - ease) * 0.3));
    color = mix(from, to, smoothstep(0.35, 0.85, p));
  } else if (uType == 9) {
    float size = max(1.0, min(p, 1.0 - p) * 2.0 * 60.0);
    vec2 cell = size / uResolution;
    vec2 snapped = cell * (floor(uv / cell) + 0.5);
    color = mix(getFrom(snapped), getTo(snapped), step(0.5, p));
  } else if (uType == 10) {
    float angle = atan(uv.y - 0.5, uv.x - 0.5) + 3.14159265;
    float sweep = ease * 6.2831853;
    color = mix(getFrom(uv), getTo(uv), 1.0 - smoothstep(sweep - 0.08, sweep + 0.08, angle));
  } else {
    float radius = sin(p * 3.14159265) * 0.006;
    color = mix(blurred(uFrom, uv, radius), blurred(uTo, uv, radius), ease);
  }
  outColor = color;
}`;
