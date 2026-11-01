import {Edges, RoundedBox} from '@react-three/drei';
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {CanvasTexture, Color, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace, type Texture} from 'three';
import {C, hdr} from '../theme';
import {Halo, LightBeam} from './materials';
import {rng, type V3} from './util';

/* Ortak malzemeler: koyu, yansıtıcı metal gövde + HDR ışık şeritleri */

export const Metal: React.FC<{color?: string; rough?: number; metal?: number}> = ({color = '#0b1428', rough = 0.32, metal = 0.85}) => (
  <meshStandardMaterial color={color} metalness={metal} roughness={rough} envMapIntensity={1.3} />
);

export const Glow: React.FC<{color?: string; k?: number; opacity?: number}> = ({color = C.cyan, k = 3, opacity = 1}) => (
  <meshBasicMaterial color={hdr(color, k)} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
);

/* ---------- Veri paketi: cam kabuk + parlayan çekirdek + başlık (header) şeridi ---------- */

export const Packet: React.FC<{
  position?: V3;
  rotation?: V3;
  size?: number;
  color?: string;
  header?: string;
  glow?: number;
  opacity?: number;
}> = ({position = [0, 0, 0], rotation = [0, 0, 0], size = 1, color = C.cyan, header = C.violet, glow = 1, opacity = 1}) => {
  if (opacity <= 0.001) return null;
  return (
    <group position={position} rotation={rotation} scale={size}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={C.navy2}
          metalness={0.1}
          roughness={0.08}
          transparent
          opacity={0.35 * opacity}
          envMapIntensity={2}
          clearcoat={1}
          depthWrite={false}
        />
        <Edges threshold={15} color={hdr(color, 4 * glow)} />
      </mesh>
      <mesh scale={0.52}>
        <boxGeometry args={[1, 1, 1]} />
        <Glow color={color} k={3.2 * glow} opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.02, 0.12, 1.02]} />
        <Glow color={header} k={2.6 * glow} opacity={opacity} />
      </mesh>
    </group>
  );
};

/* ---------- Bilgisayar ekranı ---------- */

export const Monitor: React.FC<{
  position?: V3;
  rotation?: V3;
  scale?: number;
  screen?: Texture | null;
  screenK?: number;
  showBack?: boolean;
}> = ({position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, screen, screenK = 1.4, showBack = true}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {showBack ? (
      <RoundedBox args={[3.5, 2.12, 0.12]} radius={0.05} smoothness={4}>
        <Metal color="#070d1c" rough={0.25} />
      </RoundedBox>
    ) : null}
    <mesh position={[0, 0, 0.064]}>
      <planeGeometry args={[3.36, 1.98]} />
      {screen ? <meshBasicMaterial map={screen} color={new Color(screenK, screenK, screenK)} toneMapped={false} /> : <Glow color={C.navy} k={1} />}
    </mesh>
    {showBack ? (
      <>
        <mesh position={[0, -1.42, -0.12]}>
          <boxGeometry args={[0.32, 0.9, 0.08]} />
          <Metal color="#0c1630" rough={0.2} />
        </mesh>
        <RoundedBox args={[1.5, 0.06, 0.8]} radius={0.03} position={[0, -1.88, -0.05]}>
          <Metal color="#0c1630" rough={0.2} />
        </RoundedBox>
      </>
    ) : null}
  </group>
);

/* ---------- Klavye (Enter tuşu ayrı, basılabilir) ---------- */

export const Keyboard: React.FC<{position?: V3; rotation?: V3; press?: number; enterGlow?: number}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  press = 0,
  enterGlow = 0,
}) => {
  const ref = useRef<InstancedMesh>(null);
  const cols = 14;
  const rows = 5;
  const key = 0.19;
  const gap = 0.035;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Sağ uçta Enter tuşunun yeri boş kalır
        if (c >= cols - 2 && (r === 1 || r === 2)) {
          o.scale.set(0, 0, 0);
        } else {
          o.scale.set(1, 1, 1);
        }
        o.position.set((c - (cols - 1) / 2) * (key + gap), 0.07, (r - (rows - 1) / 2) * (key + gap));
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  const enterX = (cols - 1.5 - (cols - 1) / 2) * (key + gap);
  const enterZ = (1.5 - (rows - 1) / 2) * (key + gap);
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[3.4, 0.08, 1.3]} radius={0.03}>
        <Metal color="#070d1c" rough={0.3} />
      </RoundedBox>
      <instancedMesh ref={ref} args={[undefined, undefined, rows * cols]}>
        <boxGeometry args={[key, 0.06, key]} />
        <Metal color="#0e1a33" rough={0.4} metal={0.6} />
      </instancedMesh>
      {/* Alttan sızan klavye ışığı */}
      <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.3, 1.2]} />
        <Glow color={C.blue} k={0.5} opacity={0.5} />
      </mesh>
      <group position={[enterX, 0.07 - press * 0.035, enterZ]}>
        <RoundedBox args={[key * 2 + gap, 0.07, key * 2 + gap]} radius={0.015}>
          <meshStandardMaterial color="#0e1a33" emissive={hdr(C.cyan, 0.12 + enterGlow * 1.4)} metalness={0.5} roughness={0.35} toneMapped={false} />
        </RoundedBox>
      </group>
      {enterGlow > 0.01 ? <Halo position={[enterX, 0.2, enterZ]} size={1.2 * enterGlow + 0.3} color={C.cyan} intensity={1.5 * enterGlow} /> : null}
    </group>
  );
};

/* ---------- Bina cephesi dokusu: panel çizgileri + küçük LED pencereler ---------- */

let facadeTex: CanvasTexture | null = null;
const getFacadeTexture = () => {
  if (facadeTex) return facadeTex;
  const w = 128;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const r = rng(77);
  for (let y = 0; y < h; y += 16) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, y, w, 1);
    for (let x = 6; x < w - 8; x += 14) {
      const v = r();
      if (v > 0.55) {
        ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.pow(r(), 2) * 0.85})`;
        ctx.fillRect(x, y + 6, 9, 3);
      }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, 0, 2, h);
  ctx.fillRect(w / 2, 0, 1, h);
  facadeTex = new CanvasTexture(cv);
  facadeTex.wrapS = RepeatWrapping;
  facadeTex.wrapT = RepeatWrapping;
  facadeTex.colorSpace = SRGBColorSpace;
  facadeTex.anisotropy = 8;
  return facadeTex;
};

/** Cephe dokulu metal blok (kule katmanları, sunucu binaları) */
export const FacadeBlock: React.FC<{size: V3; position?: V3; accent?: string; glow?: number; tile?: number}> = ({
  size,
  position = [0, 0, 0],
  accent = C.cyan,
  glow = 0.6,
  tile = 8,
}) => {
  const map = useMemo(() => {
    const tex = getFacadeTexture().clone();
    tex.repeat.set(Math.max(1, Math.round(size[0] / 3)), size[1] / tile);
    tex.needsUpdate = true;
    return tex;
  }, [size[0], size[1], tile]);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#070f22" metalness={0.85} roughness={0.25} envMapIntensity={1.4} emissive={hdr(accent, 1)} emissiveMap={map} emissiveIntensity={glow} toneMapped={false} />
    </mesh>
  );
};

/** Dikey kenar ışıkları (bir bloğun 4 köşesi) */
const CornerLights: React.FC<{w: number; h: number; y: number; color: string; k: number}> = ({w, h, y, color, k}) => (
  <>
    {[
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].map(([sx, sz], i) => (
      <mesh key={i} position={[(sx * w) / 2, y, (sz * w) / 2]}>
        <boxGeometry args={[0.08, h, 0.08]} />
        <Glow color={color} k={k} />
      </mesh>
    ))}
  </>
);

/* ---------- Mimari sunucu kulesi: kademeli gökdelen silüeti ---------- */

export const Tower: React.FC<{
  position?: V3;
  height?: number;
  width?: number;
  accent?: string;
  lit?: number;
  beam?: number;
}> = ({position = [0, 0, 0], height = 20, width = 3, accent = C.cyan, lit = 0, beam = 0}) => {
  const sections = [
    {w: width * 1.3, h: height * 0.32},
    {w: width, h: height * 0.43},
    {w: width * 0.68, h: height * 0.25},
  ];
  let y = 0.6;
  const k = 0.5 + lit * 5;
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[width * 2, 0.6, width * 2]} />
        <Metal />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[width * 2.04, 0.04, width * 2.04]} />
        <Glow color={accent} k={k * 0.6} />
      </mesh>
      {sections.map((sec, i) => {
        const cy = y + sec.h / 2;
        y += sec.h;
        return (
          <group key={i}>
            <FacadeBlock size={[sec.w, sec.h, sec.w]} position={[0, cy, 0]} accent={i === 1 ? accent : C.blueGlow} glow={0.35 + lit * 2.2} />
            <CornerLights w={sec.w + 0.02} h={sec.h} y={cy} color={accent} k={k * 0.8} />
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[sec.w + 0.18, 0.08, sec.w + 0.18]} />
              <Glow color={i === 0 ? C.violet : accent} k={0.8 + lit * 3} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, height + 1.6, 0]} rotation={[0, lit * 2, 0]}>
        <octahedronGeometry args={[width * 0.3, 0]} />
        <Glow color={C.white} k={1.5 + lit * 5} />
      </mesh>
      <Halo position={[0, height + 1.6, 0]} size={width * (1.4 + lit * 2.6)} color={accent} intensity={0.5 + lit * 1.2} />
      {beam > 0.01 ? <LightBeam position={[0, height + 60, 0]} length={58} radius={width * 0.7} color={accent} intensity={0.22 * beam} /> : null}
    </group>
  );
};

/* ---------- Sunucu odası rafları (tek çizimde yüzlerce raf) ---------- */

export const RackRows: React.FC<{
  t: number;
  rows?: number;
  perRow?: number;
  spacing?: number;
  aisle?: number;
  position?: V3;
  activity?: number;
  seed?: number;
}> = ({t, rows = 2, perRow = 14, spacing = 1.6, aisle = 6, position = [0, 0, 0], activity = 1, seed = 11}) => {
  const bodies = useRef<InstancedMesh>(null);
  const leds = useRef<InstancedMesh>(null);
  const count = rows * perRow;
  const ledPerRack = 6;
  const layout = useMemo(() => {
    const out: V3[] = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < perRow; i++) {
        const side = r % 2 === 0 ? -1 : 1;
        const lane = Math.floor(r / 2);
        out.push([side * (aisle / 2 + lane * 3.2), 0, -i * spacing]);
      }
    }
    return out;
  }, [rows, perRow, spacing, aisle]);
  const phases = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: count * ledPerRack}, () => [r() * 10, 0.6 + r() * 2.2, r()] as const);
  }, [count, seed]);

  useLayoutEffect(() => {
    const o = new Object3D();
    layout.forEach((p, i) => {
      o.position.set(p[0], 1.6, p[2]);
      o.rotation.set(0, p[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      bodies.current?.setMatrixAt(i, o.matrix);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
  }, [layout]);

  // LED'ler: her rafın önünde 6 sıra, sürekli değişen yoğunluk (t'ye bağlı, deterministik)
  useLayoutEffect(() => {
    const m = leds.current;
    if (!m) return;
    const o = new Object3D();
    const col = new Color();
    const cyan = hdr(C.cyan, 1);
    const violet = hdr(C.violet, 1);
    layout.forEach((p, i) => {
      const face = p[0] < 0 ? 1 : -1;
      for (let j = 0; j < ledPerRack; j++) {
        const idx = i * ledPerRack + j;
        const [ph, sp, pick] = phases[idx];
        o.position.set(p[0] + face * 0.61, 0.5 + j * 0.42, p[2]);
        o.rotation.set(0, Math.PI / 2, 0);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        m.setMatrixAt(idx, o.matrix);
        const blink = 0.35 + 0.65 * Math.max(0, Math.sin(t * sp * 3 + ph));
        col.copy(pick > 0.8 ? violet : cyan).multiplyScalar((0.8 + blink * 3) * activity);
        m.setColorAt(idx, col);
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group position={position}>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]}>
        <boxGeometry args={[1.2, 3.2, 1.2]} />
        <Metal color="#081022" rough={0.28} />
      </instancedMesh>
      <instancedMesh ref={leds} args={[undefined, undefined, count * ledPerRack]}>
        <boxGeometry args={[1.0, 0.05, 0.02]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

/* ---------- IP kristali ---------- */

export const Crystal: React.FC<{position?: V3; size?: number; spin?: number; glow?: number; color?: string}> = ({
  position = [0, 0, 0],
  size = 1,
  spin = 0,
  glow = 1,
  color = C.cyan,
}) => (
  <group position={position} rotation={[spin * 0.4, spin, 0]} scale={size}>
    <mesh>
      <octahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial color={C.white} emissive={hdr(color, 0.6 * glow)} metalness={0.2} roughness={0.05} clearcoat={1} flatShading envMapIntensity={2.5} />
      <Edges threshold={10} color={hdr(C.white, 3 * glow)} />
    </mesh>
    <mesh scale={0.45}>
      <octahedronGeometry args={[1, 0]} />
      <Glow color={C.white} k={4 * glow} />
    </mesh>
    <Halo size={4 * glow} color={color} intensity={1.2 * glow} />
  </group>
);

/* ---------- Uç nokta platformu (istemci / sunucu) ---------- */

export const Platform: React.FC<{position?: V3; radius?: number; accent?: string; lit?: number}> = ({position = [0, 0, 0], radius = 3, accent = C.cyan, lit = 0.5}) => (
  <group position={position}>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[radius, radius * 1.08, 0.3, 6]} />
      <Metal />
    </mesh>
    <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
      <ringGeometry args={[radius * 0.86, radius * 0.92, 6]} />
      <Glow color={accent} k={1 + lit * 3} />
    </mesh>
    <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
      <ringGeometry args={[radius * 0.4, radius * 0.42, 6]} />
      <Glow color={C.violet} k={0.8 + lit * 2} />
    </mesh>
  </group>
);

/* ---------- Uzak dijital şehir: yüzlerce kule silüeti (tek çizim) ---------- */

export const CityField: React.FC<{
  count?: number;
  inner?: number;
  outer?: number;
  center?: V3;
  seed?: number;
  maxH?: number;
  /** Sadece bu yöndeki açı aralığına yerleştir (radyan), varsayılan tam çember */
  arc?: [number, number];
}> = ({count = 260, inner = 70, outer = 240, center = [0, 0, 0], seed = 5, maxH = 40, arc = [0, Math.PI * 2]}) => {
  const bodies = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const r = rng(seed);
    const o = new Object3D();
    const col = new Color();
    for (let i = 0; i < count; i++) {
      const a = arc[0] + r() * (arc[1] - arc[0]);
      const d = inner + Math.pow(r(), 0.8) * (outer - inner);
      const h = 4 + Math.pow(r(), 2.2) * maxH;
      const w = 1.5 + r() * 3.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      o.position.set(x, h / 2, z);
      o.rotation.set(0, r() * Math.PI, 0);
      o.scale.set(w, h, w);
      o.updateMatrix();
      bodies.current?.setMatrixAt(i, o.matrix);
      o.position.set(x, h + 0.05, z);
      o.scale.set(w * 1.02, 0.1, w * 1.02);
      o.updateMatrix();
      caps.current?.setMatrixAt(i, o.matrix);
      const pick = r();
      col.copy(hdr(pick > 0.85 ? C.violet : pick > 0.3 ? C.cyan : C.blueGlow, 0.6 + r() * 2.2));
      caps.current?.setColorAt(i, col);
    }
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (caps.current) {
      caps.current.instanceMatrix.needsUpdate = true;
      if (caps.current.instanceColor) caps.current.instanceColor.needsUpdate = true;
    }
  }, [count, inner, outer, seed, maxH, arc]);
  return (
    <group position={center}>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <Metal color="#060d1f" rough={0.4} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

/* ---------- Veri merkezi binası (dışarıdan) ---------- */

export const DataCenter: React.FC<{position?: V3; lit?: number; door?: number}> = ({position = [0, 0, 0], lit = 0.3, door = 0}) => (
  <group position={position}>
    <FacadeBlock size={[22, 16, 12]} position={[0, 8, 0]} accent={C.blueGlow} glow={0.4 + lit} tile={6} />
    <FacadeBlock size={[14, 8, 9]} position={[0, 20, -1]} accent={C.cyan} glow={0.4 + lit} tile={6} />
    <FacadeBlock size={[4, 14, 4]} position={[-12, 7, 3]} accent={C.violet} glow={0.3 + lit} tile={6} />
    <FacadeBlock size={[4, 18, 4]} position={[12, 9, 3]} accent={C.cyan} glow={0.3 + lit} tile={6} />
    <mesh position={[0, 16.05, 0]}>
      <boxGeometry args={[22.3, 0.12, 12.3]} />
      <Glow color={C.cyan} k={1 + lit * 2} />
    </mesh>
    <mesh position={[0, 24.05, -1]}>
      <boxGeometry args={[14.3, 0.12, 9.3]} />
      <Glow color={C.violet} k={1 + lit * 2} />
    </mesh>
    {/* Giriş kapısı: bağlantı tünelinin bittiği yer */}
    <mesh position={[0, 2.2, 6.02]}>
      <ringGeometry args={[1.7, 2.1, 6]} />
      <Glow color={C.cyan} k={1.5 + door * 4} />
    </mesh>
    <mesh position={[0, 2.2, 6.01]}>
      <circleGeometry args={[1.7, 6]} />
      <Glow color={C.blueGlow} k={0.3 + door * 2.5} />
    </mesh>
    <Halo position={[0, 2.2, 6.5]} size={4 + door * 6} color={C.cyan} intensity={0.4 + door} />
    <Halo position={[0, 26, -1]} size={10} color={C.violet} intensity={0.25 + lit * 0.5} />
  </group>
);

/* ---------- Protokol katmanı plakası (HTTP/3, QUIC, UDP, TLS) ---------- */

export const LayerPlate: React.FC<{position?: V3; size?: [number, number]; color?: string; glow?: number; opacity?: number; rotation?: V3}> = ({
  position = [0, 0, 0],
  size = [2.4, 1.6],
  color = C.cyan,
  glow = 1,
  opacity = 1,
  rotation = [0, 0, 0],
}) => {
  if (opacity <= 0.001) return null;
  return (
    <group position={position} rotation={rotation} scale={0.6 + opacity * 0.4}>
      <RoundedBox args={[size[0], 0.14, size[1]]} radius={0.05}>
        <meshPhysicalMaterial color={C.navy2} metalness={0.2} roughness={0.05} transparent opacity={0.45 * opacity} clearcoat={1} envMapIntensity={2} depthWrite={false} />
        <Edges threshold={20} color={hdr(color, 3.5 * glow)} />
      </RoundedBox>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size[0] * 0.86, 0.04, size[1] * 0.8]} />
        <Glow color={color} k={0.9 * glow} opacity={0.85 * opacity} />
      </mesh>
      <Halo size={size[0] * 1.6} color={color} intensity={0.35 * glow * opacity} />
    </group>
  );
};

/* ---------- Router: merkez + dönen routing tablosu + yön kapısı ---------- */

export const Router: React.FC<{
  position: V3;
  /** 0→1: tablo dönerek eşleşen satırı öne getirir */
  lookup?: number;
  /** Paketin geldiği yön (radyan, Y ekseni etrafında) */
  inYaw?: number;
  /** Seçilen çıkış yönü (radyan) */
  outYaw?: number;
  /** Kapının çıkışa dönme ilerlemesi */
  gate?: number;
  lit?: number;
  scale?: number;
}> = ({position, lookup = 0, inYaw = 0, outYaw = 0, gate = 0, lit = 0.3, scale = 1}) => {
  const slabs = 16;
  const match = lookup > 0.85 ? (lookup - 0.85) / 0.15 : 0;
  const spin = inYaw + (1 - easeOutCubic(lookup)) * Math.PI * 2.5;
  const gateYaw = inYaw + Math.PI + (outYaw - inYaw - Math.PI) * gate;
  return (
    <group position={position} scale={scale}>
      {/* Taşıyıcı direk */}
      <mesh position={[0, -position[1] / scale / 2, 0]}>
        <cylinderGeometry args={[0.35, 0.6, position[1] / scale, 8]} />
        <Metal />
      </mesh>
      <mesh>
        <cylinderGeometry args={[2, 2.1, 1.3, 8]} />
        <Metal color="#0a1532" rough={0.2} metal={0.9} />
      </mesh>
      {[-0.66, 0.66].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]}>
          <torusGeometry args={[2.1, 0.05, 6, 8]} />
          <Glow color={C.cyan} k={1 + lit * 3} />
        </mesh>
      ))}
      {/* Routing tablosu: hub etrafında dönen satır plakaları */}
      <group rotation={[0, spin, 0]}>
        {Array.from({length: slabs}).map((_, i) => {
          const a = (i / slabs) * Math.PI * 2;
          const isMatch = i === 0;
          const k = isMatch ? 0.6 + match * 5 : 0.35 + lit * 0.8;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <group position={[0, 0, 3.1]}>
                <mesh>
                  <boxGeometry args={[1.0, 2.2, 0.06]} />
                  <Metal color="#0b1838" rough={0.3} />
                </mesh>
                {[0.75, 0.38, 0, -0.38, -0.75].map((y, j) => (
                  <mesh key={j} position={[j === 2 ? -0.1 : 0, y, 0.04]}>
                    <boxGeometry args={[j === 2 ? 0.6 : 0.8, 0.07, 0.01]} />
                    <Glow color={isMatch ? C.white : j % 2 ? C.blueGlow : C.cyan} k={k * (j === 2 && isMatch ? 1.6 : 1)} />
                  </mesh>
                ))}
              </group>
            </group>
          );
        })}
      </group>
      {/* Yön kapısı: seçilen çıkışı gösteren ok */}
      <group position={[0, 1.15, 0]} rotation={[0, gateYaw, 0]}>
        <mesh position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.45, 1.0, 4]} />
          <Glow color={C.violet} k={1.2 + gate * 3} />
        </mesh>
        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.9, 8]} />
          <Glow color={C.violet} k={1 + gate * 2} />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <Glow color={C.white} k={1.2 + lit * 2.5} />
      </mesh>
      <Halo size={4 + lit * 4} color={C.cyan} intensity={0.35 + lit * 0.8} />
    </group>
  );
};

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/* ---------- İstek / yanıt kapsülü ---------- */

export const Capsule: React.FC<{position?: V3; color?: string; ring?: string; glow?: number; scale?: number; spin?: number; opacity?: number}> = ({
  position = [0, 0, 0],
  color = C.cyan,
  ring = C.violet,
  glow = 1,
  scale = 1,
  spin = 0,
  opacity = 1,
}) => {
  if (opacity <= 0.001) return null;
  return (
    <group position={position} scale={scale * (0.7 + 0.3 * opacity)} rotation={[Math.PI / 2, 0, 0]}>
      <group rotation={[0, spin, 0]}>
        <mesh>
          <capsuleGeometry args={[0.45, 1.3, 8, 24]} />
          <meshPhysicalMaterial color={C.navy2} metalness={0.1} roughness={0.05} transparent opacity={0.4 * opacity} clearcoat={1} envMapIntensity={2} depthWrite={false} />
        </mesh>
        <mesh>
          <capsuleGeometry args={[0.26, 1.1, 8, 16]} />
          <Glow color={color} k={3 * glow} opacity={opacity} />
        </mesh>
        {[-0.45, 0, 0.45].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.03, 8, 48]} />
            <Glow color={ring} k={2.5 * glow} opacity={opacity} />
          </mesh>
        ))}
      </group>
      <Halo size={3 * glow} color={color} intensity={0.8 * glow * opacity} />
    </group>
  );
};
