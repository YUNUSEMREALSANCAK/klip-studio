import {MeshReflectorMaterial} from '@react-three/drei';
import React, {useMemo} from 'react';
import {C} from '../../../kit/theme';
import {SERVER} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, Halo, LightBeam} from '../../../kit/three/materials';
import {Capsule, Glow, Metal, Packet, RackRows} from '../../../kit/three/parts';
import {Stage} from '../../../kit/three/Stage';
import {along, easeIn, easeInOut, easeOut, lerp3, makeCurve, prog, pulse, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 6 · Application Server isteği işler, Database'den veri çeker, HTTP Response oluşturur */

export const CORE: V3 = [0, 0, -34];
export const DB: V3 = [7.5, 0, -34];
const IN_PATH: V3[] = [[0, 2.4, 9], [0, 2.6, -8], [0, 3.6, -24], [0, 4.6, -31.5]];
const OUT_PATH: V3[] = [[0, 10.2, -34], [0, 8.5, -22], [0, 6.5, -6], [0, 6.2, 8]];
const STREAM: V3[] = [[DB[0], 3.7, DB[2]], [5.2, 6.5, -34], [2.2, 6.2, -34], [0.9, 5.2, -34]];

/** Uygulama sunucusu çekirdeği: üst üste dönen halkalar + parlayan merkez sütun */
const AppCore: React.FC<{t: number; power: number}> = ({t, power}) => (
  <group position={CORE}>
    <mesh position={[0, 0.4, 0]}>
      <cylinderGeometry args={[3.4, 3.8, 0.8, 8]} />
      <Metal />
    </mesh>
    <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.9, 3.1, 8]} />
      <Glow color={C.cyan} k={1 + power * 3} />
    </mesh>
    <mesh position={[0, 5, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 8.4, 32]} />
      <Glow color={C.cyan} k={0.8 + power * 1.6} />
    </mesh>
    {Array.from({length: 7}).map((_, i) => (
      <group key={i} position={[0, 1.6 + i * 1.15, 0]} rotation={[0, (i % 2 ? 1 : -1) * t * (0.4 + power * 2.2) + i, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.0 - Math.abs(i - 3) * 0.12, 0.16, 8, 6]} />
          <Metal color="#0c1a3a" rough={0.2} metal={0.95} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.0 - Math.abs(i - 3) * 0.12, 0.04, 6, 6]} />
          <Glow color={i % 3 === 0 ? C.violet : C.cyan} k={1 + power * 4} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 9.6, 0]}>
      <cylinderGeometry args={[2.2, 1.6, 0.5, 8]} />
      <Metal />
    </mesh>
    <Halo position={[0, 5, 0]} size={7 + power * 4} color={C.cyan} intensity={0.25 + power * 0.5} />
    <LightBeam position={[0, 22, 0]} length={12} radius={3} color={C.cyan} intensity={0.1 + power * 0.25} />
  </group>
);

/** Veritabanı: üst üste diskler (klasik DB simgesinin 3D hali) */
const Database: React.FC<{lit: number}> = ({lit}) => (
  <group position={DB}>
    {[0, 1, 2].map((i) => (
      <group key={i} position={[0, 0.7 + i * 1.05, 0]}>
        <mesh>
          <cylinderGeometry args={[1.6, 1.6, 0.85, 48]} />
          <meshStandardMaterial color="#0d1838" metalness={0.85} roughness={0.22} envMapIntensity={1.5} />
        </mesh>
        <mesh position={[0, 0.43, 0]}>
          <cylinderGeometry args={[1.62, 1.62, 0.04, 48]} />
          <Glow color={C.violet} k={1 + lit * 4} />
        </mesh>
        <mesh position={[0, -0.43, 0]}>
          <cylinderGeometry args={[1.62, 1.62, 0.04, 48]} />
          <Glow color={C.purple} k={0.6 + lit * 2} />
        </mesh>
      </group>
    ))}
    <Halo position={[0, 2, 0]} size={5 + lit * 4} color={C.violet} intensity={0.3 + lit} />
  </group>
);

/** Tavan ışık şeritleri */
const Ceiling: React.FC = () => (
  <>
    {[-5, 0, 5].map((x) => (
      <mesh key={x} position={[x, 12, -18]}>
        <boxGeometry args={[0.18, 0.06, 56]} />
        <Glow color={x === 0 ? C.cyan : C.blueGlow} k={x === 0 ? 2 : 1.2} />
      </mesh>
    ))}
    <mesh position={[0, 12.3, -18]}>
      <boxGeometry args={[30, 0.3, 60]} />
      <Metal color="#050b1a" rough={0.5} />
    </mesh>
  </>
);

export const cam: CamKey[] = [
  {t: 61.6, p: [0, 1.7, 8], l: [0, 2.3, -10], fov: 46},
  {t: 63.0, p: [0.7, 2.3, -11], l: [0, 3.8, -34], fov: 46},
  {t: 64.4, p: [-5, 5, -23.5], l: [0, 4.6, -34], fov: 44},
  {t: 66.0, p: [-1.5, 6, -23], l: [5, 3.8, -34], fov: 44},
  {t: 67.6, p: [3, 9.5, -22], l: [0, 9.6, -34], fov: 42},
  {t: 69.3, p: [0, 7.2, 1], l: [0, 6.5, -12], fov: 46},
];

export const S6Server: React.FC = () => {
  const t = useSceneTime('server');
  const curves = useMemo(() => ({inn: makeCurve(IN_PATH), out: makeCurve(OUT_PATH)}), []);

  const arrive = (i: number) => easeInOut(prog(t, 61.6 + i * 0.12, 63.3 + i * 0.12));
  const merge = prog(t, 63.3, 63.9);
  const power = Math.max(prog(t, 63.4, 64.2) * (1 - prog(t, 68.5, 69.3) * 0.5), 0);
  const dbLit = pulse(t, SERVER.db - 0.2, 67.2, 0.3);
  const stream = easeOut(prog(t, 64.9, 65.6));
  const respForm = easeOut(prog(t, SERVER.response - 0.2, SERVER.create));
  const respGo = easeIn(prog(t, 67.8, 69.4));

  return (
    <Stage t={t} cam={cam} fog={0.02} bloom={1.25} bokeh={t > 63.8 && t < 67.8 ? 3 : 0} focusRange={6}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]}>
        <planeGeometry args={[60, 80]} />
        <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={4} blur={[200, 60]} roughness={0.7} color="#050b18" metalness={0.7} mirror={0.7} />
      </mesh>
      <Ceiling />
      <RackRows t={t} rows={4} perRow={16} spacing={1.6} aisle={7} position={[0, 0, 2]} activity={1 + power * 0.6} />
      <RackRows t={t + 3} rows={4} perRow={16} spacing={1.6} aisle={7} position={[0, 0, -40]} activity={0.8} seed={23} />

      <AppCore t={t} power={power} />
      <Database lit={dbLit} />
      <Fiber t={t} points={STREAM} radius={0.09} base={C.violet} baseK={0.6} pulse={C.purple} pulseK={6} count={8} speed={2.2} progress={stream} head={1 - prog(t, 65.6, 66)} opacity={1 - prog(t, 66.8, 67.4)} />
      <pointLight position={[0, 6, -30]} intensity={20} distance={24} color={C.cyan} />
      <pointLight position={[7.5, 4, -31]} intensity={dbLit * 14} distance={14} color={C.violet} />

      {/* Paketler koridordan gelir, çekirdekte birleşip isteğe dönüşür */}
      {Array.from({length: 6}).map((_, i) => {
        const s = arrive(i);
        const base = along(curves.inn, s);
        const offs: V3 = [((i % 3) - 1) * 0.6, (Math.floor(i / 3) - 0.5) * 0.6, 0];
        const pos = lerp3([base[0] + offs[0] * (1 - s), base[1] + offs[1] * (1 - s), base[2]], [0, 4.6, -31.5], merge);
        return <Packet key={i} position={pos} size={0.42} rotation={[t * 1.5 + i, t + i, 0]} opacity={1 - merge} glow={1.2} />;
      })}
      <Capsule position={lerp3([0, 4.6, -31.5], [0, 4.6, -34], prog(t, 63.8, 64.4))} opacity={merge * (1 - prog(t, 64.2, 64.5))} spin={t * 2} />

      {/* HTTP Response: çekirdeğin üstünde doğar, dışarı fırlar */}
      <Capsule position={respGo > 0 ? along(curves.out, respGo) : [0, 10.2, -34]} opacity={respForm} color={C.white} ring={C.cyan} glow={1.2 + respForm * 0.6} spin={-t * 2} scale={1.1} />
      {respForm > 0 && respForm < 1 ? <Halo position={[0, 10.2, -34]} size={8} color={C.purple} intensity={1.6 * (1 - respForm)} /> : null}

      <Dust t={t} count={900} center={[0, 6, -18]} spread={[24, 12, 60]} size={0.06} />
    </Stage>
  );
};
