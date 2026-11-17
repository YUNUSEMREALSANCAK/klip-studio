import {MeshReflectorMaterial} from '@react-three/drei';
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {Color, InstancedMesh, Object3D} from 'three';
import {C, hdr} from '../../../kit/theme';
import {COMPUTER} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Halo, LightBeam} from '../../../kit/three/materials';
import {Glow, Keyboard, Monitor, Packet, Tower} from '../../../kit/three/parts';
import {drawBrowser, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {easeInOut, easeOut, prog, rng} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 1 · Bilgisayar → URL → Enter → ekranın içine dalış */

export const cam: CamKey[] = [
  {t: 0, p: [6.2, 1.4, 10.5], l: [0, -0.3, 0], fov: 32},
  {t: 2.6, p: [2.6, 0.6, 6.0], l: [-0.2, 0.2, 0], fov: 32},
  {t: 3.9, p: [-0.35, 0.95, 2.7], l: [-0.75, 0.82, 0], fov: 32},
  {t: 4.45, p: [2.5, -1.15, 2.95], l: [1.3, -1.8, 1.35], fov: 32},
  {t: 5.1, p: [2.25, -1.25, 2.7], l: [1.25, -1.78, 1.3], fov: 32},
  {t: 5.9, p: [0.7, -0.05, 4.2], l: [0, 0, 0], fov: 34},
  {t: 6.7, p: [0, 0.02, 1.8], l: [0, 0, -2], fov: 40},
  {t: 7.2, p: [0, 0, 0.0], l: [0, 0, -6], fov: 58, ease: 'in'},
  {t: 9.3, p: [0, 0, -44], l: [0, 0.1, -90], fov: 64},
];

/** Ekranın arkasındaki "onlarca işlem": hızla akan ışık çizgileri */
const Streaks: React.FC<{t: number; visible: number}> = ({t, visible}) => {
  const ref = useRef<InstancedMesh>(null);
  const n = 520;
  const data = useMemo(() => {
    const r = rng(42);
    const palette = [C.cyan, C.blueGlow, C.violet, C.white, C.cyan];
    return Array.from({length: n}, () => {
      const a = r() * Math.PI * 2;
      const rad = 1.6 + Math.pow(r(), 0.7) * 10;
      return {x: Math.cos(a) * rad, y: Math.sin(a) * rad, z: -3 - r() * 220, len: 1.5 + r() * 7, sp: 10 + r() * 30, col: palette[Math.floor(r() * palette.length)], k: 1.5 + r() * 4};
    });
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    const col = new Color();
    data.forEach((d, i) => {
      o.position.set(d.x, d.y, d.z + (t - COMPUTER.dive) * d.sp);
      o.scale.set(1, 1, d.len * (0.2 + visible * 0.8));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      col.copy(hdr(d.col, d.k * visible));
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[0.03, 0.03, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

/** Veri tünelinin halkaları: hız ve derinlik hissi */
const TunnelRings: React.FC<{visible: number}> = ({visible}) => (
  <>
    {Array.from({length: 16}).map((_, i) => {
      const z = -8 - i * 9;
      const big = i % 4 === 0;
      return (
        <group key={i} position={[0, 0, z]} rotation={[0, 0, i * 0.4]}>
          <mesh>
            <torusGeometry args={[big ? 7 : 6, big ? 0.05 : 0.025, 8, 96]} />
            <Glow color={i % 3 === 1 ? C.violet : C.cyan} k={(big ? 3 : 1.6) * visible} />
          </mesh>
          {big ? (
            <mesh>
              <torusGeometry args={[7.6, 0.25, 4, 6]} />
              <meshStandardMaterial color={C.navy2} metalness={0.9} roughness={0.3} transparent opacity={visible} />
            </mesh>
          ) : null}
        </group>
      );
    })}
  </>
);

export const S1Computer: React.FC = () => {
  const t = useSceneTime('computer');
  const typed = easeInOut(prog(t, COMPUTER.typeStart - 0.4, COMPUTER.typeEnd));
  const press = prog(t, COMPUTER.enter - 0.12, COMPUTER.enter) * (1 - prog(t, COMPUTER.enter + 0.15, COMPUTER.enter + 0.35));
  const enterGlow = prog(t, COMPUTER.enter - 0.05, COMPUTER.enter + 0.05) * (1 - prog(t, COMPUTER.enter + 0.4, COMPUTER.enter + 1.4));
  const loading = easeOut(prog(t, COMPUTER.enter + 0.2, COMPUTER.dive + 0.8));
  const portal = easeInOut(prog(t, 6.2, 7.0));
  const inside = prog(t, 6.95, 7.25);
  const room = inside < 1;

  const screen = useCanvasTexture(SCREEN_W, SCREEN_H, (ctx) =>
    drawBrowser(ctx, {typed, cursor: Math.floor(t * 2.4) % 2 === 0 || (typed > 0 && typed < 1), loading, portal}),
  );

  return (
    <Stage t={t} cam={cam} fog={room ? 0.02 : 0.012} bloom={1.15} bokeh={t < 6.4 ? 3 : 0} focusRange={3}>
      {room ? (
        <>
          {/* Masa yüzeyi: koyu, yansıtıcı */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.92, 0]}>
            <planeGeometry args={[60, 60]} />
            <MeshReflectorMaterial
              resolution={512}
              mixBlur={1}
              mixStrength={3}
              blur={[400, 120]}
              roughness={0.85}
              depthScale={0.6}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color="#050a17"
              metalness={0.6}
              mirror={0.6}
            />
          </mesh>
          <Monitor screen={screen} screenK={1.25 + portal * 2.2} showBack={inside < 0.5} />
          <Keyboard position={[0, -1.86, 1.5]} press={press} enterGlow={enterGlow} />

          {/* Ekranın arkasından vuran soğuk ışık ve kenar ışığı */}
          <LightBeam position={[0, 9, -2.5]} length={12} radius={4.5} color={C.blueGlow} intensity={0.2} />
          <Halo position={[0, 0.2, -1.2]} size={9} color={C.blue} intensity={0.35 + portal * 0.8} />
          <pointLight position={[-3, 2, -2]} intensity={6} distance={12} color={C.cyan} />
          <pointLight position={[3, 1, 3]} intensity={3} distance={10} color={C.violet} />

          {/* Uzakta: dijital evrenin silüetleri */}
          <Tower position={[-26, -1.92, -70]} height={26} width={3} lit={0} />
          <Tower position={[22, -1.92, -85]} height={34} width={3.4} accent={C.violet} lit={0} />
          <Dust t={t} count={700} center={[0, 2, -6]} spread={[30, 14, 30]} size={0.05} />
        </>
      ) : null}

      {/* Ekranın içi: veri tüneli, ışık çizgileri ve ilk paketler */}
      {t > 6.4 ? (
        <>
          <Streaks t={t} visible={prog(t, 6.6, 7.4)} />
          <TunnelRings visible={prog(t, 6.9, 7.6)} />
          <Packet position={[0.9, -0.5, -18 + (t - 7) * 6]} size={0.45} rotation={[t, t * 0.7, 0]} opacity={prog(t, 7, 7.6)} />
          <Packet position={[-1.1, 0.6, -30 + (t - 7) * 9]} size={0.35} rotation={[t * 0.6, t, 0]} color={C.blueGlow} opacity={prog(t, 7, 7.6)} />
          <Packet position={[0.4, 1.1, -46 + (t - 7) * 4]} size={0.5} rotation={[t * 0.4, t * 0.9, 0]} opacity={prog(t, 7, 7.6)} />
          <Packet position={[-2.2, -1.4, -70 + (t - 7) * 7]} size={0.4} rotation={[t * 0.8, t * 0.3, 0]} header={C.cyan} color={C.violet} opacity={prog(t, 7, 7.6)} />
          <Halo position={[0, 0, -120]} size={60} color={C.cyan} intensity={0.6 * prog(t, 7, 8)} />
        </>
      ) : null}
    </Stage>
  );
};
