import React, {useMemo} from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ShaderMaterial,
  SRGBColorSpace,
  TubeGeometry,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import {C, hdr} from '../theme';
import {rng, type V3} from './util';

/* ---------- Fiber optik kablo: içinden ışık darbeleri akan tüp ---------- */

const fiberVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fiberFragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uBase;
uniform vec3 uPulse;
uniform float uTime;
uniform float uSpeed;
uniform float uCount;
uniform float uWidth;
uniform float uProgress;
uniform float uOpacity;
uniform float uHead;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  if (vUv.x > uProgress) discard;
  float p = fract(vUv.x * uCount - uTime * uSpeed);
  float d = abs(p - 0.5) * 2.0;
  float dash = pow(1.0 - smoothstep(0.0, uWidth, d), 2.0);
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
  float head = uHead * smoothstep(uProgress - 0.025, uProgress, vUv.x);
  vec3 col = uBase * (0.45 + 1.1 * rim) + uPulse * dash + uPulse * head * 2.5;
  gl_FragColor = vec4(col, uOpacity);
  #include <fog_fragment>
}`;

export type FiberProps = {
  points: V3[];
  t: number;
  radius?: number;
  base?: string;
  baseK?: number;
  pulse?: string;
  pulseK?: number;
  speed?: number;
  count?: number;
  width?: number;
  progress?: number;
  head?: number;
  opacity?: number;
  segments?: number;
};

/** Işık darbeleri akan fiber kablo. progress ile uçtan uca "inşa" edilebilir. */
export const Fiber: React.FC<FiberProps> = ({
  points,
  t,
  radius = 0.08,
  base = C.blue,
  baseK = 0.35,
  pulse = C.cyan,
  pulseK = 6,
  speed = 0.6,
  count = 6,
  width = 0.18,
  progress = 1,
  head = 0,
  opacity = 1,
  segments = 200,
}) => {
  const key = JSON.stringify(points);
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal');
    return new TubeGeometry(curve, segments, radius, 12, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, radius, segments]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: fiberVertex,
        fragmentShader: fiberFragment,
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uBase: {value: new Color()},
            uPulse: {value: new Color()},
            uTime: {value: 0},
            uSpeed: {value: 1},
            uCount: {value: 6},
            uWidth: {value: 0.2},
            uProgress: {value: 1},
            uOpacity: {value: 1},
            uHead: {value: 0},
          },
        ]),
      }),
    [],
  );

  const u = material.uniforms;
  u.uBase.value.copy(hdr(base, baseK));
  u.uPulse.value.copy(hdr(pulse, pulseK));
  u.uTime.value = t;
  u.uSpeed.value = speed;
  u.uCount.value = count;
  u.uWidth.value = width;
  u.uProgress.value = progress;
  u.uOpacity.value = opacity;
  u.uHead.value = head;

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
};

/* ---------- Dijital zemin: mesafeyle sönen ızgara ---------- */

const gridVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const gridFragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform vec3 uMajor;
uniform float uSize;
uniform float uOpacity;
varying vec3 vWorld;
float lineAt(vec2 p, float size, float thick) {
  vec2 c = p / size;
  vec2 g = abs(fract(c - 0.5) - 0.5) / max(fwidth(c) * thick, vec2(1e-4));
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  float minor = lineAt(vWorld.xz, uSize, 1.0);
  float major = lineAt(vWorld.xz, uSize * 5.0, 1.6);
  vec3 col = uColor * minor * 0.6 + uMajor * major;
  float a = max(minor * 0.6, major) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;

export const GridFloor: React.FC<{y?: number; size?: number; opacity?: number; color?: string; extent?: number}> = ({
  y = 0,
  size = 2,
  opacity = 1,
  color = C.blue,
  extent = 3000,
}) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: gridVertex,
        fragmentShader: gridFragment,
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: UniformsUtils.merge([UniformsLib.fog, {uColor: {value: new Color()}, uMajor: {value: new Color()}, uSize: {value: 2}, uOpacity: {value: 1}}]),
      }),
    [],
  );
  material.uniforms.uColor.value.copy(hdr(color, 0.35));
  material.uniforms.uMajor.value.copy(hdr(C.cyan, 0.9));
  material.uniforms.uSize.value = size;
  material.uniforms.uOpacity.value = opacity;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={material} renderOrder={-1}>
      <planeGeometry args={[extent, extent]} />
    </mesh>
  );
};

/* ---------- Işık hüzmesi (sahte hacimsel ışık) ---------- */

const beamVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const beamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float along = pow(vUv.y, 1.4);
  float a = facing * facing * along * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}`;

/** Koni şeklinde, uca doğru sönen ışık hüzmesi. Tepe noktası position'da, -Y yönüne açılır. */
export const LightBeam: React.FC<{
  position?: V3;
  rotation?: V3;
  length?: number;
  radius?: number;
  color?: string;
  intensity?: number;
}> = ({position = [0, 0, 0], rotation = [0, 0, 0], length = 20, radius = 4, color = C.cyan, intensity = 0.4}) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {uColor: {value: new Color()}, uOpacity: {value: 1}},
      }),
    [],
  );
  material.uniforms.uColor.value.copy(hdr(color, 1));
  material.uniforms.uOpacity.value = intensity;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -length / 2, 0]} material={material}>
        <cylinderGeometry args={[0.05, radius, length, 48, 1, true]} />
      </mesh>
    </group>
  );
};

/* ---------- Yumuşak parıltı dokusu (halo, toz, nokta ışıklar) ---------- */

let glowTex: CanvasTexture | null = null;
export const getGlowTexture = () => {
  if (glowTex) return glowTex;
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  glowTex = new CanvasTexture(canvas);
  glowTex.colorSpace = SRGBColorSpace;
  return glowTex;
};

/** Kameraya dönük yumuşak ışık halesi */
export const Halo: React.FC<{position?: V3; size?: number; color?: string; intensity?: number}> = ({
  position = [0, 0, 0],
  size = 2,
  color = C.cyan,
  intensity = 1,
}) => (
  <sprite position={position} scale={[size, size, size]}>
    <spriteMaterial map={getGlowTexture()} color={hdr(color, intensity)} blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
  </sprite>
);

/* ---------- Havada süzülen dijital toz ---------- */

export const Dust: React.FC<{
  t: number;
  count?: number;
  center?: V3;
  spread?: V3;
  size?: number;
  color?: string;
  seed?: number;
  drift?: number;
}> = ({t, count = 900, center = [0, 0, 0], spread = [60, 30, 60], size = 0.12, color = C.cyanSoft, seed = 3, drift = 0.15}) => {
  const base = useMemo(() => {
    const r = rng(seed);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (r() - 0.5) * spread[0];
      arr[i * 3 + 1] = (r() - 0.5) * spread[1];
      arr[i * 3 + 2] = (r() - 0.5) * spread[2];
    }
    return arr;
  }, [count, seed, spread[0], spread[1], spread[2]]);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const positions = geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < count; i++) {
    const ph = i * 1.37;
    positions[i * 3] = base[i * 3] + Math.sin(t * 0.3 + ph) * drift * 4;
    positions[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.21 + ph * 1.7) * drift * 3;
    positions[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.25 + ph) * drift * 4;
  }
  geometry.attributes.position.needsUpdate = true;

  return (
    <points position={center} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={getGlowTexture()}
        size={size}
        sizeAttenuation
        color={hdr(color, 1.6)}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

/* ---------- Şifreli bağlantı tüneli: altıgen örgülü cam zırh ---------- */

const hexVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const hexFragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform vec3 uEdge;
uniform float uProgress;
uniform float uOpacity;
uniform float uTime;
uniform vec2 uRepeat;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}
vec4 hexCoords(vec2 uv) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return vec4(gv, uv - gv);
}
void main() {
  // İki uçtan ortaya doğru örülür
  float d = min(vUv.y, 1.0 - vUv.y);
  if (d > uProgress * 0.5 + 0.001) discard;
  vec4 hc = hexCoords(vUv * uRepeat);
  float e = hexDist(hc.xy);
  float edge = smoothstep(0.42, 0.5, e);
  float front = smoothstep(uProgress * 0.5 - 0.04, uProgress * 0.5, d);
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float shimmer = 0.5 + 0.5 * sin(hc.w * 0.6 + hc.z * 0.9 - uTime * 3.0);
  vec3 col = uColor * (0.12 + rim * 0.6) + uEdge * edge * (0.5 + 0.5 * shimmer) + uEdge * front * 2.0;
  float a = (0.08 + edge * 0.7 + rim * 0.3 + front) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;

/** Z ekseni boyunca uzanan altıgen zırhlı tünel. progress: iki uçtan ortaya örülme. */
export const HexTunnel: React.FC<{
  from: V3;
  length: number;
  radius?: number;
  t: number;
  progress?: number;
  opacity?: number;
  color?: string;
  edge?: string;
  edgeK?: number;
}> = ({from, length, radius = 1.6, t, progress = 1, opacity = 1, color = C.blue, edge = C.violet, edgeK = 2.5}) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: hexVertex,
        fragmentShader: hexFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {uColor: {value: new Color()}, uEdge: {value: new Color()}, uProgress: {value: 1}, uOpacity: {value: 1}, uTime: {value: 0}, uRepeat: {value: [10, 40]}},
        ]),
      }),
    [],
  );
  const u = material.uniforms;
  u.uColor.value.copy(hdr(color, 1));
  u.uEdge.value.copy(hdr(edge, edgeK));
  u.uProgress.value = progress;
  u.uOpacity.value = opacity;
  u.uTime.value = t;
  u.uRepeat.value = [10, Math.round(length / 1.2)];
  if (opacity <= 0.001 || progress <= 0.001) return null;
  return (
    <mesh position={[from[0], from[1], from[2] - length / 2]} rotation={[Math.PI / 2, 0, 0]} material={material}>
      <cylinderGeometry args={[radius, radius, length, 48, 1, true]} />
    </mesh>
  );
};

/* ---------- Gökyüzü: tepede gece mavisi, ufukta açılan mavi pus ---------- */

export const Sky: React.FC<{horizon?: string; zenith?: string; glow?: number}> = ({horizon = '#0c2152', zenith = '#01040c', glow = 1}) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uBand; varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
            col = mix(col, uZenith * 0.6, smoothstep(0.0, -0.25, h));
            col += uBand * exp(-abs(h) * 18.0);
            gl_FragColor = vec4(col, 1.0);
          }`,
        uniforms: {uHorizon: {value: new Color()}, uZenith: {value: new Color()}, uBand: {value: new Color()}},
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  material.uniforms.uHorizon.value.set(horizon);
  material.uniforms.uZenith.value.set(zenith);
  material.uniforms.uBand.value.copy(hdr(C.blueGlow, 0.18 * glow));
  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[2500, 32, 16]} />
    </mesh>
  );
};
