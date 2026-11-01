import {MeshReflectorMaterial} from '@react-three/drei';
import React, {useMemo} from 'react';
import {C} from '../../../kit/theme';
import {PACKETS} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo, HexTunnel} from '../../../kit/three/materials';
import {Capsule, CityField, Monitor, Packet, Platform, Router} from '../../../kit/three/parts';
import {drawBrowser, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {along, easeIn, easeInOut, easeOut, lerp, lerp3, makeCurve, prog, pulse, rng, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';
import {TUNNEL_LEN, TUNNEL_START} from './S4Handshake';

/* Sahne 5 · HTTP GET → IP paketleri → Router'lar routing tablosuna göre iletir */

export const R1: V3 = [0, 2.2, -45];
export const R2: V3 = [28, 8, -85];
const END: V3 = [40, 10, -140];
const ROUTE: V3[] = [[0, 2.2, -1], [0, 2.2, -30], R1, [14, 5.5, -66], R2, [35, 9.5, -112], END];
const S_R1 = 0.29;
const S_R2 = 0.62;
const yaw = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

/** Ağın geri kalanı: router'lara bağlı diğer kablolar */
export const NETWORK: V3[][] = [
  [R1, [-14, 5, -62], [-30, 6, -80]],
  [R1, [0, 2.2, -70], [0, 3, -100]],
  [R2, [42, 9, -78], [60, 9, -70]],
  [R2, [24, 7, -110], [20, 6, -130]],
  [[-40, 4, -20], [-20, 3, -38], R1],
  [[-60, 12, -120], [-30, 6, -80]],
  [[0, 3, -100], [20, 6, -130]],
];

/** Paket katarının başı: router'larda bekler, tablo bakıldıktan sonra devam eder */
const headS = (t: number) => {
  if (t < 53.9) return lerp(0, 0.1, easeOut(prog(t, PACKETS.get, 53.9)));
  if (t < 57.0) return lerp(0.1, S_R1 - 0.012, easeOut(prog(t, 53.9, 57.0)));
  if (t < 58.2) return S_R1 - 0.012;
  if (t < 59.4) return lerp(S_R1 - 0.012, S_R2 - 0.012, easeInOut(prog(t, 58.2, 59.4)));
  if (t < 59.9) return S_R2 - 0.012;
  return lerp(S_R2 - 0.012, 1, easeIn(prog(t, 59.9, 62)));
};

const N = 6;

export const cam: CamKey[] = [
  {t: 49.5, p: [0.8, 2.9, 3.5], l: [0, 2.2, -6], fov: 44},
  {t: 50.9, p: [0.7, 2.8, -3], l: [0, 2.2, -13], fov: 46},
  {t: 52.5, p: [2.6, 3.4, -9.5], l: [0, 2.2, -16], fov: 44},
  {t: 54.0, p: [3.4, 3.2, -13.5], l: [0, 2.2, -17.5], fov: 42},
  {t: 55.6, p: [7, 7, -22], l: [0, 2.2, -44], fov: 44},
  {t: 57.3, p: [6.5, 5.5, -35.5], l: [0, 2.2, -45], fov: 42},
  {t: 58.6, p: [6, 9, -45], l: [14, 5, -66], fov: 44},
  {t: 59.8, p: [18, 12, -68], l: [28, 8, -85], fov: 42},
  {t: 61.8, p: [31, 13, -95], l: [40, 10, -140], fov: 46},
];

export const S5Packets: React.FC = () => {
  const t = useSceneTime('packets');
  const route = useMemo(() => makeCurve(ROUTE), []);
  const screen = useCanvasTexture(SCREEN_W, SCREEN_H, (ctx) => drawBrowser(ctx, {typed: 1, cursor: false, loading: 0.62, portal: 0.15}));
  const jitter = useMemo(() => {
    const r = rng(5);
    return Array.from({length: N}, () => [(r() - 0.5) * 0.5, (r() - 0.5) * 0.4] as const);
  }, []);

  const split = prog(t, PACKETS.split - 0.1, PACKETS.split + 0.5);
  const capsulePos = along(route, headS(t));
  const tunnelFade = 1 - prog(t, 52.6, 53.8);

  // Router 1: paket gelince tablo döner, eşleşen satır parlar, kapı R2'ye döner
  const look1 = easeInOut(prog(t, 56.9, 57.9));
  const gate1 = easeInOut(prog(t, 57.7, 58.2));
  const look2 = easeInOut(prog(t, 59.35, 59.8));
  const gate2 = easeInOut(prog(t, 59.65, 59.95));

  return (
    <Stage t={t} cam={cam} fog={0.008} bloom={1.2} bokeh={t > 52.8 && t < 54.6 ? 3.5 : 0} focusRange={3}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[700, 700]} />
        <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={2.5} blur={[300, 80]} roughness={0.9} color="#040916" metalness={0.5} mirror={0.5} />
      </mesh>
      <GridFloor y={0.005} size={2} opacity={0.5} />
      <CityField count={320} inner={80} outer={330} seed={17} maxH={55} />

      <Platform position={[0, 0, 0]} radius={2.4} lit={0.6} />
      <Monitor position={[0, 1.24, 0]} scale={0.5} screen={screen} screenK={1.4} />

      {/* Mantıksal bağlantı (QUIC tüneli) paketler ağa çıkınca kaybolur, fiziksel ağ görünür */}
      <HexTunnel from={TUNNEL_START} length={TUNNEL_LEN} t={t} opacity={tunnelFade * 0.3} edgeK={1.4} />

      <Fiber t={t} points={ROUTE} radius={0.1} baseK={0.45} pulseK={4} speed={0.8} count={14} width={0.12} opacity={0.35 + (1 - tunnelFade) * 0.65} />
      {NETWORK.map((pts, i) => (
        <Fiber key={i} t={t + i} points={pts} radius={0.08} base={i % 3 === 0 ? C.violet : C.blue} baseK={0.35} pulse={i % 3 === 0 ? C.purple : C.cyan} pulseK={3} speed={0.5 + (i % 3) * 0.2} count={5} />
      ))}

      <Router position={R1} lookup={look1} inYaw={yaw(R1, [0, 2.2, -30])} outYaw={yaw(R1, [14, 5.5, -66])} gate={gate1} lit={0.3 + pulse(t, 56.9, 58.5) * 0.7} />
      <Router position={R2} lookup={look2} inYaw={yaw(R2, [14, 5.5, -66])} outYaw={yaw(R2, [35, 9.5, -112])} gate={gate2} lit={0.3 + pulse(t, 59.3, 60.3) * 0.7} />
      <Router position={[-30, 6, -80]} lit={0.2} lookup={1} scale={0.8} />
      <Router position={[20, 6, -130]} lit={0.2} lookup={1} scale={0.8} />

      {/* HTTP GET kapsülü → IP paketleri */}
      <Capsule position={capsulePos} opacity={1 - split} spin={t * 2} glow={1} />
      {split > 0 && split < 1 ? <Halo position={capsulePos} size={4} color={C.white} intensity={0.8 * (1 - split)} /> : null}
      {split > 0
        ? Array.from({length: N}).map((_, i) => {
            const s = headS(t - i * 0.13) - i * 0.011;
            const target = along(route, Math.max(0, s));
            const burst = easeOut(prog(t, PACKETS.split, PACKETS.split + 0.6));
            const pos = lerp3([capsulePos[0] + jitter[i][0], capsulePos[1] + jitter[i][1], capsulePos[2]], target, burst);
            return <Packet key={i} position={pos} size={0.42} rotation={[t * 1.5 + i, t + i * 0.7, 0]} glow={1.2} opacity={split} />;
          })
        : null}

      <Dust t={t} count={1400} center={[10, 8, -60]} spread={[90, 30, 140]} size={0.12} />
    </Stage>
  );
};
