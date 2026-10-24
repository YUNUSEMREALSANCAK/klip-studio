import type { BlendMode, Crop, FilterSettings, MaskSettings, Transform, TransitionType } from '../core/types';
import { croppedSize, fitRect, overlayRect } from './layout';
import { filterFragment, transitionFragment } from './effects';
import { layerFragment, QUAD_VERTEX, TRANSITION_FRAGMENT, TRANSITION_INDEX } from './shaders';

export interface Mask {
  data: Uint8Array; // rows top to bottom, single channel
  width: number;
  height: number;
}

export interface LutData {
  id: string;
  size: number;
  data: Uint8Array; // size³ × RGB
}

export interface Layer {
  source: TexImageSource;
  width: number;
  height: number;
  filter: FilterSettings;
  transform: Transform;
  mode: 'contain' | 'cover' | 'overlay';
  focusX?: number; // horizontal focus in cover mode (0..1)
  matte?: Mask | null; // background removal matte
  shape?: MaskSettings; // shape mask
  chroma?: { color: string; similarity: number; smoothness: number };
  lut?: LutData | null;
  blur?: number; // sample spacing (source pixels)
  opacity?: number;
  effect?: { code: string; amount: number; time: number }; // custom filter
  crop?: Crop;
  blendMode?: BlendMode;
}

const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'screen', 'add', 'lighten', 'darken'];

type Target = 'screen' | 'from' | 'to';

// A small WebGL2 compositor that draws layers and transitions.
export class Compositor {
  readonly gl: WebGL2RenderingContext;
  width: number;
  height: number;
  private layerProgram: WebGLProgram;
  private transitionProgram: WebGLProgram;
  private quad: WebGLBuffer;
  private sourceTexture: WebGLTexture;
  private maskTexture: WebGLTexture;
  private identityLut: WebGLTexture;
  private lutTextures = new Map<string, WebGLTexture>();
  private effectPrograms = new Map<string, WebGLProgram | null>();
  private targets: Record<'from' | 'to', { fb: WebGLFramebuffer; texture: WebGLTexture }>;
  private background: [number, number, number] = [0, 0, 0];

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number) {
    const gl = canvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('Your browser does not support WebGL2');
    this.gl = gl as WebGL2RenderingContext;
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;
    this.layerProgram = this.createProgram(QUAD_VERTEX, layerFragment());
    this.transitionProgram = this.createProgram(QUAD_VERTEX, TRANSITION_FRAGMENT);
    this.quad = this.gl.createBuffer()!;
    this.sourceTexture = this.createTexture();
    this.maskTexture = this.createTexture();
    this.identityLut = this.createLut(2, new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 0, 255, 255, 0, 0, 0, 255, 255, 0, 255, 0, 255, 255, 255, 255, 255]));
    this.targets = { from: this.createTarget(), to: this.createTarget() };
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    const canvas = this.gl.canvas;
    canvas.width = this.width = width;
    canvas.height = this.height = height;
    for (const target of Object.values(this.targets)) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, target.texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    }
  }

  begin(background: string) {
    this.background = hexToRgb(background);
    this.clear('screen');
    this.clear('from');
    this.clear('to');
  }

  drawLayer(layer: Layer, target: Target = 'screen') {
    const { gl } = this;
    const effect = layer.effect && layer.effect.amount > 0 ? layer.effect : undefined;
    const program = (effect && this.effectProgram('filter', effect.code)) || this.layerProgram;
    this.bindTarget(target);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    this.setBlend(layer.blendMode ?? 'normal');

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer.source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // Unit 1 always gets the mask texture; otherwise the target texture left over from a
    // previous transition stays bound and WebGL rejects drawing into it (feedback loop).
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    if (layer.matte) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, layer.matte.width, layer.matte.height, 0, gl.RED, gl.UNSIGNED_BYTE, flipRows(layer.matte));
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_3D, layer.lut ? this.lutTexture(layer.lut) : this.identityLut);

    const f = layer.filter;
    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform1i(u('uSource'), 0);
    gl.uniform1i(u('uMatte'), 1);
    gl.uniform1i(u('uLut'), 2);
    gl.uniform1i(u('uUseMatte'), layer.matte ? 1 : 0);
    gl.uniform2f(u('uTexel'), 1 / layer.width, 1 / layer.height);
    gl.uniform1f(u('uBlur'), layer.blur ?? 0);
    gl.uniform1f(u('uLutIntensity'), layer.lut ? f.lutIntensity : 0);
    gl.uniform1f(u('uLutSize'), layer.lut?.size ?? 2);
    const shape = layer.shape;
    gl.uniform1i(u('uShape'), shape ? { rect: 1, ellipse: 2, linear: 3 }[shape.shape] : 0);
    // UI y runs top to bottom; texture coordinates run bottom to top.
    if (shape) gl.uniform4f(u('uShapeRect'), shape.x, 1 - shape.y, shape.width, shape.height);
    gl.uniform1f(u('uFeather'), shape?.feather ?? 0);
    gl.uniform1i(u('uShapeInvert'), shape?.invert ? 1 : 0);
    gl.uniform1i(u('uChroma'), layer.chroma ? 1 : 0);
    if (layer.chroma) {
      const [r, g, b] = hexToRgb(layer.chroma.color);
      gl.uniform2f(u('uKey'), -0.1687 * r - 0.3313 * g + 0.5 * b, 0.5 * r - 0.4187 * g - 0.0813 * b);
      gl.uniform1f(u('uSimilarity'), layer.chroma.similarity * 0.4);
      gl.uniform1f(u('uSmoothness'), Math.max(layer.chroma.smoothness * 0.2, 0.002));
    }
    gl.uniform1f(u('uBrightness'), f.brightness);
    gl.uniform1f(u('uContrast'), f.contrast);
    gl.uniform1f(u('uSaturation'), f.saturation);
    gl.uniform1f(u('uTemperature'), f.temperature);
    gl.uniform1f(u('uVignette'), f.vignette);
    gl.uniform1f(u('uSharpen'), f.sharpen);
    gl.uniform1i(u('uGrayscale'), f.grayscale ? 1 : 0);
    gl.uniform1f(u('uOpacity'), layer.opacity ?? 1);
    gl.uniform1f(u('uEffectAmount'), program === this.layerProgram ? 0 : effect!.amount);
    gl.uniform1f(u('time'), effect?.time ?? 0);
    gl.uniform2f(u('resolution'), layer.width, layer.height);
    gl.uniform1i(u('uBlendMode'), BLEND_MODES.indexOf(layer.blendMode ?? 'normal'));
    const crop = layer.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    // Texture rows are flipped on upload, so v runs from the bottom of the image.
    const uv: [number, number, number, number] = [crop.x, 1 - crop.y - crop.height, crop.x + crop.width, 1 - crop.y];
    gl.uniform4f(u('uCrop'), uv[0], uv[1], crop.width, crop.height);

    this.drawQuad(program, this.layerRect(layer), layer.transform.rotation, uv);
    this.setBlend('normal');
    gl.disable(gl.BLEND);
  }

  // Multiply and darken pair with a shader output of mix(1, color, alpha); the others with color × alpha.
  private setBlend(mode: BlendMode) {
    const { gl } = this;
    gl.blendEquation(mode === 'lighten' ? gl.MAX : mode === 'darken' ? gl.MIN : gl.FUNC_ADD);
    if (mode === 'multiply') gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    else if (mode === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else if (mode === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  // A custom transition (GLSL code) replaces the built-in type; if it doesn't compile, the type is used.
  drawTransition(type: TransitionType, progress: number, code?: string) {
    const { gl } = this;
    const custom = code ? this.effectProgram('transition', code) : null;
    this.bindTarget('screen');
    gl.useProgram(custom ?? this.transitionProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.targets.from.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.targets.to.texture);
    if (custom) {
      const u = (name: string) => gl.getUniformLocation(custom, name);
      gl.uniform1i(u('uFrom'), 0);
      gl.uniform1i(u('uTo'), 1);
      gl.uniform1f(u('progress'), Math.min(Math.max(progress, 0), 1));
      gl.uniform1f(u('ratio'), this.width / this.height);
      gl.uniform2f(u('resolution'), this.width, this.height);
      this.drawQuad(custom, [0, 0, this.width, this.height]);
      return;
    }
    const u = (name: string) => gl.getUniformLocation(this.transitionProgram, name);
    gl.uniform1i(u('uFrom'), 0);
    gl.uniform1i(u('uTo'), 1);
    gl.uniform1f(u('uProgress'), progress);
    gl.uniform1i(u('uType'), TRANSITION_INDEX[type]);
    gl.uniform2f(u('uResolution'), this.width, this.height);
    this.drawQuad(this.transitionProgram, [0, 0, this.width, this.height]);
  }

  // Compiled once per code; null when it fails, so callers fall back to the built-in program.
  private effectProgram(kind: 'transition' | 'filter', code: string) {
    const key = `${kind}\n${code}`;
    if (!this.effectPrograms.has(key)) {
      let program: WebGLProgram | null = null;
      try {
        program = this.createProgram(QUAD_VERTEX, kind === 'transition' ? transitionFragment(code) : filterFragment(code));
      } catch (error) {
        console.warn(`Custom ${kind} failed to compile; using the built-in effect.`, error);
      }
      this.effectPrograms.set(key, program);
    }
    return this.effectPrograms.get(key)!;
  }

  // The layer's rectangle on the canvas: [x, y, width, height] in pixels from the top left.
  private layerRect(layer: Layer): [number, number, number, number] {
    const { width: W, height: H } = this;
    const { transform } = layer;
    const { width: w, height: h } = croppedSize(layer.width, layer.height, layer.crop);
    if (layer.mode === 'overlay') {
      const r = overlayRect(transform, w, h, W, H);
      return [r.x, r.y, r.w, r.h];
    }
    const r = fitRect(transform, w, h, W, H, layer.mode, layer.focusX);
    return [r.x, r.y, r.w, r.h];
  }

  // Draws the rectangle (pixels from the top left), optionally rotated around its center.
  private drawQuad(program: WebGLProgram, [x, y, w, h]: [number, number, number, number], rotation = 0, [u0, v0, u1, v1] = [0, 0, 1, 1]) {
    const { gl } = this;
    // Without rotation, snap to whole pixels so subpixel shifts don't shimmer at the edges.
    const snap = rotation ? (v: number) => v : Math.round;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const angle = (rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corner = (px: number, py: number, u: number, v: number) => {
      const dx = px - cx;
      const dy = py - cy;
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;
      return [(snap(rx) / this.width) * 2 - 1, 1 - (snap(ry) / this.height) * 2, u, v];
    };
    // position (x, y) + uv (u, v); bottom-left uv is (0,0)
    const data = new Float32Array([...corner(x, y + h, u0, v0), ...corner(x + w, y + h, u1, v0), ...corner(x, y, u0, v1), ...corner(x + w, y, u1, v1)]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    const uv = gl.getAttribLocation(program, 'aUv');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private lutTexture(lut: LutData) {
    let texture = this.lutTextures.get(lut.id);
    if (!texture) {
      texture = this.createLut(lut.size, lut.data);
      this.lutTextures.set(lut.id, texture);
    }
    return texture;
  }

  private createLut(size: number, data: Uint8Array) {
    const { gl } = this;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, wrap, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB8, size, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
    return texture;
  }

  private bindTarget(target: Target) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target === 'screen' ? null : this.targets[target].fb);
    gl.viewport(0, 0, this.width, this.height);
  }

  private clear(target: Target) {
    const { gl } = this;
    this.bindTarget(target);
    const [r, g, b] = this.background;
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private createTexture() {
    const { gl } = this;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private createTarget() {
    const { gl } = this;
    const texture = this.createTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, texture };
  }

  private createProgram(vertex: string, fragment: string) {
    const { gl } = this;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'program');
    return program;
  }
}

function flipRows({ data, width, height }: Mask) {
  const out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) out.set(data.subarray(y * width, (y + 1) * width), (height - 1 - y) * width);
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
