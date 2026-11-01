import React, {useMemo} from 'react';
import {AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, ShaderMaterial} from 'three';
import {C, hdr} from '../../../kit/theme';
import {GLOBE} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, getGlowTexture, Halo} from '../../../kit/three/materials';
import {Glow, Packet} from '../../../kit/three/parts';
import {Stage} from '../../../kit/three/Stage';
import {easeInOut, prog, rng, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 2 · "Peki bu istek dünyanın diğer ucundaki bir sunucuya nasıl ulaşıyor?" */

const R = 10;

/** Kıta benzeri kümeler için basit 3D değer gürültüsü */
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (x: number) => x * x * (3 - 2 * x);
const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);
  const l = (a: number, b: number, k: number) => a + (b - a) * k;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
};
const fbm = (x: number, y: number, z: number) => noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.1;

const dir = (latDeg: number, lonDeg: number): V3 => {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
};
const CLIENT = dir(25, 0);
const SERVER = dir(-15, 180);

/** İki nokta arasında yeryüzünden yükselen yay */
const arc = (a: V3, b: V3, lift: number, n = 64): V3[] => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const om = Math.acos(Math.min(1, Math.max(-1, dot)));
  // Zıt kutuplarda düzlemi kuzey kutbundan geçir
  const mid: V3 = om > 3.1 ? [0, 1, 0] : [0, 0, 0];
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    let p: V3;
    if (om > 3.1) {
      const h = s < 0.5 ? s * 2 : (s - 0.5) * 2;
      const [p0, p1] = s < 0.5 ? [a, mid] : [mid, b];
      const o2 = Math.acos(p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2]);
      const k0 = Math.sin((1 - h) * o2) / Math.sin(o2);
      const k1 = Math.sin(h * o2) / Math.sin(o2);
      p = [p0[0] * k0 + p1[0] * k1, p0[1] * k0 + p1[1] * k1, p0[2] * k0 + p1[2] * k1];
    } else {
      const k0 = Math.sin((1 - s) * om) / Math.sin(om);
      const k1 = Math.sin(s * om) / Math.sin(om);
      p = [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
    }
    const r = R * (1.01 + lift * Math.sin(Math.PI * s));
    pts.push([p[0] * r, p[1] * r, p[2] * r]);
  }
  return pts;
};

const atmoMaterial = () =>
  new ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(uColor*f, f); }`,
    uniforms: {uColor: {value: hdr(C.cyan, 1.6)}},
    transparent: true,
    blending: AdditiveBlending,
    side: BackSide,
    depthWrite: false,
  });

const PlanetPoints: React.FC = () => {
  const {land, sea} = useMemo(() => {
    const n = 14000;
    const landPts: number[] = [];
    const seaPts: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      const v = fbm(x * 1.7 + 3, y * 1.7 + 1, z * 1.7 + 7);
      (v > 0.53 ? landPts : seaPts).push(x * R, y * R, z * R);
    }
    const mk = (arr: number[]) => {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(arr), 3));
      return g;
    };
    return {land: mk(landPts), sea: mk(seaPts)};
  }, []);
  return (
    <>
      <points geometry={land}>
        <pointsMaterial map={getGlowTexture()} size={0.24} sizeAttenuation color={hdr(C.cyan, 3.2)} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
      <points geometry={sea}>
        <pointsMaterial map={getGlowTexture()} size={0.11} sizeAttenuation color={hdr(C.blue, 1.2)} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
    </>
  );
};

/** Dünya üzerinde arka planda akan diğer bağlantılar (internetin geri kalanı) */
const NetworkArcs: React.FC<{t: number}> = ({t}) => {
  const arcs = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 16}, () => {
      const a = dir(-60 + r() * 120, r() * 360);
      const b = dir(-60 + r() * 120, r() * 360);
      return {pts: arc(a, b, 0.12 + r() * 0.15, 48), speed: 0.3 + r() * 0.6, color: r() > 0.7 ? C.violet : C.blueGlow};
    });
  }, []);
  return (
    <>
      {arcs.map((a, i) => (
        <Fiber key={i} t={t} points={a.pts} radius={0.025} base={a.color} baseK={0.25} pulse={a.color} pulseK={3} count={2} speed={a.speed} width={0.25} segments={80} />
      ))}
    </>
  );
};

const NodeMarker: React.FC<{d: V3; color: string; lit: number}> = ({d, color, lit}) => {
  const p: V3 = [d[0] * R * 1.01, d[1] * R * 1.01, d[2] * R * 1.01];
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <Glow color={C.white} k={3 + lit * 4} />
      </mesh>
      <Halo size={1.2 + lit * 1.6} color={color} intensity={0.7 + lit} />
    </group>
  );
};

export const cam: CamKey[] = [
  {t: 9.1, p: [1, 5, 26], l: [0, 2.2, 8], fov: 40},
  {t: 10.6, p: [0, 9, 52], l: [0, 1.5, 0], fov: 40},
  {t: 12.4, p: [6, 12, 56], l: [0, 1, 0], fov: 40},
  {t: 14.4, p: [0.5, -2, 24], l: [0, -4.2, 9], fov: 40, ease: 'in'},
];

export const S2Globe: React.FC = () => {
  const t = useSceneTime('globe');
  const rot = -easeInOut(prog(t, 9.6, 14.2)) * Math.PI;
  const mainArc = useMemo(() => arc(CLIENT, SERVER, 0.32, 120), []);
  const draw = easeInOut(prog(t, GLOBE.launch, GLOBE.far + 0.6));
  const headIdx = Math.min(mainArc.length - 1, Math.floor(draw * (mainArc.length - 1)));
  const head = mainArc[headIdx];
  const arrived = prog(t, GLOBE.far + 0.5, GLOBE.question);
  const atmo = useMemo(atmoMaterial, []);

  return (
    <Stage t={t} cam={cam} fog={0.004} bloom={1.25}>
      <group rotation={[0.18, rot, 0]}>
        <mesh>
          <sphereGeometry args={[R * 0.985, 64, 64]} />
          <meshStandardMaterial color={'#030a1c'} metalness={0.3} roughness={0.7} emissive={new Color(C.navy)} emissiveIntensity={0.4} />
        </mesh>
        <mesh scale={1.12} material={atmo}>
          <sphereGeometry args={[R, 64, 64]} />
        </mesh>
        <PlanetPoints />
        <NetworkArcs t={t} />
        <Fiber t={t} points={mainArc} radius={0.06} base={C.cyan} baseK={1.2} pulse={C.white} pulseK={6} count={3} speed={0.8} width={0.2} progress={draw} head={1 - arrived} />
        {draw > 0.01 && draw < 0.999 ? <Packet position={head} size={0.45} rotation={[t * 2, t * 1.4, 0]} /> : null}
        <NodeMarker d={CLIENT} color={C.cyan} lit={1 - prog(t, 10.5, 11.5) * 0.6} />
        <NodeMarker d={SERVER} color={C.violet} lit={arrived * (0.7 + 0.3 * Math.sin(t * 8))} />
        {/* Yörünge halkası */}
        <mesh rotation={[Math.PI / 2.3, 0, 0.3]}>
          <torusGeometry args={[R * 1.45, 0.015, 6, 200]} />
          <Glow color={C.blueGlow} k={1.2} opacity={0.6} />
        </mesh>
      </group>
      <Halo position={[0, 0, -6]} size={46} color={C.blue} intensity={0.25} />
      <Dust t={t} count={1200} center={[0, 0, 0]} spread={[120, 80, 120]} size={0.18} color={C.white} />
    </Stage>
  );
};
