import type { FilterSettings, Transform, TransitionType } from '../core/types';
import { fitRect, overlayRect } from './layout';
import { LAYER_FRAGMENT, QUAD_VERTEX, TRANSITION_FRAGMENT, TRANSITION_INDEX } from './shaders';

export interface Mask {
  data: Uint8Array; // satır sırası yukarıdan aşağı, tek kanal
  width: number;
  height: number;
}

export interface Layer {
  source: TexImageSource;
  width: number;
  height: number;
  filter: FilterSettings;
  transform: Transform;
  mode: 'contain' | 'cover' | 'overlay';
  focusX?: number; // cover modunda yatay odak (0..1)
  mask?: Mask | null;
  opacity?: number;
}

type Target = 'screen' | 'from' | 'to';

// WebGL2 ile katmanları ve geçişleri çizen küçük bir derleyici.
export class Compositor {
  readonly gl: WebGL2RenderingContext;
  width: number;
  height: number;
  private layerProgram: WebGLProgram;
  private transitionProgram: WebGLProgram;
  private quad: WebGLBuffer;
  private sourceTexture: WebGLTexture;
  private maskTexture: WebGLTexture;
  private targets: Record<'from' | 'to', { fb: WebGLFramebuffer; texture: WebGLTexture }>;
  private background: [number, number, number] = [0, 0, 0];

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number) {
    const gl = canvas.getContext('webgl2', { alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('Tarayıcınız WebGL2 desteklemiyor');
    this.gl = gl as WebGL2RenderingContext;
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;
    this.layerProgram = this.createProgram(QUAD_VERTEX, LAYER_FRAGMENT);
    this.transitionProgram = this.createProgram(QUAD_VERTEX, TRANSITION_FRAGMENT);
    this.quad = this.gl.createBuffer()!;
    this.sourceTexture = this.createTexture();
    this.maskTexture = this.createTexture();
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
    this.bindTarget(target);
    gl.useProgram(this.layerProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer.source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // Birim 1'e her zaman maske dokusu bağlanır; aksi hâlde bir önceki geçişten kalan
    // hedef dokusu bağlı kalır ve aynı dokuya çizim WebGL tarafından reddedilir (geri besleme döngüsü).
    const useMask = !!layer.mask;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    if (layer.mask) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, layer.mask.width, layer.mask.height, 0, gl.RED, gl.UNSIGNED_BYTE, flipRows(layer.mask));
    }

    const f = layer.filter;
    const u = (name: string) => gl.getUniformLocation(this.layerProgram, name);
    gl.uniform1i(u('uSource'), 0);
    gl.uniform1i(u('uMask'), 1);
    gl.uniform1i(u('uUseMask'), useMask ? 1 : 0);
    gl.uniform2f(u('uTexel'), 1 / layer.width, 1 / layer.height);
    gl.uniform1f(u('uBrightness'), f.brightness);
    gl.uniform1f(u('uContrast'), f.contrast);
    gl.uniform1f(u('uSaturation'), f.saturation);
    gl.uniform1f(u('uTemperature'), f.temperature);
    gl.uniform1f(u('uVignette'), f.vignette);
    gl.uniform1f(u('uSharpen'), f.sharpen);
    gl.uniform1i(u('uGrayscale'), f.grayscale ? 1 : 0);
    gl.uniform1f(u('uOpacity'), layer.opacity ?? 1);

    this.drawQuad(this.layerProgram, this.layerRect(layer));
    gl.disable(gl.BLEND);
  }

  drawTransition(type: TransitionType, progress: number) {
    const { gl } = this;
    this.bindTarget('screen');
    gl.useProgram(this.transitionProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.targets.from.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.targets.to.texture);
    const u = (name: string) => gl.getUniformLocation(this.transitionProgram, name);
    gl.uniform1i(u('uFrom'), 0);
    gl.uniform1i(u('uTo'), 1);
    gl.uniform1f(u('uProgress'), progress);
    gl.uniform1i(u('uType'), TRANSITION_INDEX[type]);
    gl.uniform2f(u('uResolution'), this.width, this.height);
    this.drawQuad(this.transitionProgram, [0, 0, this.width, this.height]);
  }

  // Katmanın tuval üzerindeki dikdörtgeni: [x, y, genişlik, yükseklik], piksel, sol üstten.
  private layerRect(layer: Layer): [number, number, number, number] {
    const { width: W, height: H } = this;
    const { width: w, height: h, transform } = layer;
    if (layer.mode === 'overlay') {
      const r = overlayRect(transform, w, h, W, H);
      return [r.x, r.y, r.w, r.h];
    }
    const r = fitRect(transform, w, h, W, H, layer.mode, layer.focusX);
    return [r.x, r.y, r.w, r.h];
  }

  private drawQuad(program: WebGLProgram, [x, y, w, h]: [number, number, number, number]) {
    const { gl } = this;
    // Tam piksele yuvarla: alt piksel kaymaları kenarlarda titreme yapmasın.
    const toClipX = (px: number) => (Math.round(px) / this.width) * 2 - 1;
    const toClipY = (py: number) => 1 - (Math.round(py) / this.height) * 2;
    const x0 = toClipX(x);
    const x1 = toClipX(x + w);
    const y0 = toClipY(y + h);
    const y1 = toClipY(y);
    // konum (x, y) + uv (u, v); alt-sol uv (0,0)
    const data = new Float32Array([x0, y0, 0, 0, x1, y0, 1, 0, x0, y1, 0, 1, x1, y1, 1, 1]);
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
