import {MeshReflectorMaterial} from '@react-three/drei';
import React, {useMemo} from 'react';
import {C} from '../../../kit/theme';
import {HANDSHAKE} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo, HexTunnel} from '../../../kit/three/materials';
import {CityField, DataCenter, Glow, LayerPlate, Monitor, Packet, Platform} from '../../../kit/three/parts';
import {drawBrowser, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {along, easeInOut, easeOut, lerp, lerp3, makeCurve, prog, pulse, rng, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 4 · HTTP/3, UDP tabanlı QUIC kullanır ve TLS 1.3'ü bağlantı kurulumuna entegre eder */

export const STACK = {
  udp: [0, 2.55, 0.3] as V3,
  quic: [0, 3.15, 0.3] as V3,
  http3: [0, 3.75, 0.3] as V3,
  tlsStart: [2.2, 3.15, 0.3] as V3,
};
export const TUNNEL_START: V3 = [0, 2.2, -1.8];
export const TUNNEL_LEN = 56;
const DC: V3 = [0, 0, -66];
const HS_PATH: V3[] = [STACK.quic, [0, 2.5, -2.6], [0, 2.2, -20], [0, 2.2, -59]];

/** UDP datagramları: önce dağınık, QUIC ile düzenli akışlara (stream) dönüşür */
const Datagrams: React.FC<{t: number}> = ({t}) => {
  const items = useMemo(() => {
    const r = rng(21);
    return Array.from({length: 18}, (_, i) => ({ph: r(), jx: (r() - 0.5) * 3, jy: (r() - 0.5) * 1.6, lane: i % 3, sp: 0.55 + r() * 0.35}));
  }, []);
  const on = prog(t, HANDSHAKE.udp - 0.1, HANDSHAKE.udp + 0.3) * (1 - prog(t, 46.2, 46.8));
  if (on <= 0) return null;
  const order = easeInOut(prog(t, HANDSHAKE.quic, HANDSHAKE.quic + 0.8));
  return (
    <>
      {items.map((d, i) => {
        const s = (d.ph + (t - HANDSHAKE.udp) * d.sp * 0.5) % 1;
        const z = lerp(-0.5, -40, s);
        const laneX = (d.lane - 1) * 0.5;
        const x = lerp(d.jx * s * 1.5, laneX, order);
        const y = lerp(2.4 + d.jy * s, 2.2, order);
        const fade = Math.min(1, s * 8) * Math.min(1, (1 - s) * 4);
        return <Packet key={i} position={[x, y, z]} size={0.16} rotation={[t * 3 + i, t * 2, 0]} color={order > 0.5 ? C.cyan : C.blueGlow} header={C.violet} opacity={on * fade} glow={0.8} />;
      })}
    </>
  );
};

const TunnelRings: React.FC<{progress: number; ready: number}> = ({progress, ready}) => {
  const n = 14;
  return (
    <>
      {Array.from({length: n}).map((_, i) => {
        const f = i / (n - 1);
        const d = Math.min(f, 1 - f);
        const vis = progress > 0.001 && d <= progress * 0.5 + 0.01 ? 1 : 0;
        if (!vis) return null;
        return (
          <mesh key={i} position={[TUNNEL_START[0], TUNNEL_START[1], TUNNEL_START[2] - f * TUNNEL_LEN]}>
            <torusGeometry args={[1.75, 0.05, 8, 64]} />
            <Glow color={i % 2 ? C.cyan : C.blueGlow} k={1.4 + ready * 3} />
          </mesh>
        );
      })}
    </>
  );
};

export const cam: CamKey[] = [
  {t: 37.7, p: [6.5, 4.2, 9.5], l: [0, 2.6, -24], fov: 40},
  {t: 39.6, p: [5.5, 4.2, 7.5], l: [0, 3.0, 0], fov: 38},
  {t: 41.0, p: [4.4, 3.9, 6.2], l: [0, 3.15, 0.3], fov: 38},
  {t: 43.3, p: [4.6, 4.3, 7.0], l: [0.5, 3.15, 0.3], fov: 38},
  {t: 45.6, p: [4.8, 4.4, 7.2], l: [0.7, 3.15, 0.3], fov: 38},
  {t: 46.7, p: [11, 6.5, -12], l: [0, 2.4, -32], fov: 42},
  {t: 47.8, p: [7, 5, -8], l: [0, 2.2, -30], fov: 42},
  {t: 48.6, p: [1.8, 3.4, 5.2], l: [0, 2.3, -30], fov: 42},
  {t: 49.7, p: [0.8, 2.9, 3.5], l: [0, 2.2, -6], fov: 44},
];

export const S4Handshake: React.FC = () => {
  const t = useSceneTime('handshake');
  const curve = useMemo(() => makeCurve(HS_PATH), []);
  const screen = useCanvasTexture(SCREEN_W, SCREEN_H, (ctx) => drawBrowser(ctx, {typed: 1, cursor: false, loading: 0.45 + prog(t, 37.7, 49.7) * 0.15, portal: 0.15}));

  const http3 = easeOut(prog(t, HANDSHAKE.http3, HANDSHAKE.http3 + 0.5));
  const udp = easeOut(prog(t, HANDSHAKE.udp, HANDSHAKE.udp + 0.5));
  const quic = easeOut(prog(t, HANDSHAKE.quic, HANDSHAKE.quic + 0.5));
  const tls = easeOut(prog(t, HANDSHAKE.tls, HANDSHAKE.tls + 0.5));
  const merge = easeInOut(prog(t, HANDSHAKE.setup, HANDSHAKE.setup + 0.7));
  const fused = prog(t, HANDSHAKE.setup + 0.6, HANDSHAKE.setup + 1.0);

  const hello = easeInOut(prog(t, 45.6, 46.5));
  const reply = easeInOut(prog(t, 46.5, 47.4));
  const tunnel = easeInOut(prog(t, 46.8, 48.2));
  const ready = pulse(t, HANDSHAKE.ready - 0.1, 49.9, 0.3);

  return (
    <Stage t={t} cam={cam} fog={0.009} bloom={1.2} bokeh={t > 40.5 && t < 45.7 ? 3 : 0} focusRange={2.5}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[600, 600]} />
        <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={2.5} blur={[300, 80]} roughness={0.9} color="#040916" metalness={0.5} mirror={0.5} />
      </mesh>
      <GridFloor y={0.005} size={2} opacity={0.5} />
      <CityField count={300} inner={90} outer={320} seed={13} maxH={50} />

      <Platform position={[0, 0, 0]} radius={2.4} lit={0.6} />
      <Monitor position={[0, 1.24, 0]} scale={0.5} screen={screen} screenK={1.4} />
      <pointLight position={[0, 5, 3]} intensity={8} distance={14} color={C.cyan} />

      {/* Protokol yığını: HTTP/3 → QUIC → UDP, TLS 1.3 QUIC'in içine kayar */}
      <LayerPlate position={STACK.http3} size={[1.9, 1.25]} color={C.cyan} opacity={http3} glow={1.2} />
      <LayerPlate position={STACK.quic} size={[1.9, 1.25]} color={fused > 0 ? C.purple : C.white} opacity={quic} glow={1 + fused * 0.8} />
      <LayerPlate position={STACK.udp} size={[1.9, 1.25]} color={C.blueGlow} opacity={udp} />
      {fused < 1 ? <LayerPlate position={lerp3(STACK.tlsStart, STACK.quic, merge)} color={C.violet} opacity={tls * (1 - fused)} glow={1.3} size={[1.6, 1.1]} /> : null}
      {fused > 0 && fused < 1 ? <Halo position={STACK.quic} size={5} color={C.purple} intensity={2 * (1 - fused)} /> : null}

      {/* Sunucuya giden kılavuz çizgi ve el sıkışma */}
      <Fiber t={t} points={[TUNNEL_START, [0, 2.2, -59]]} radius={0.025} baseK={0.2} pulseK={1.2} count={20} width={0.3} progress={easeOut(prog(t, 38, 39.5))} opacity={1 - tunnel} segments={60} />
      <Datagrams t={t} />
      {hello > 0 && hello < 1 ? <Packet position={along(curve, hello)} size={0.75} rotation={[t * 2, t * 3, 0]} color={C.cyan} header={C.violet} glow={1.6} /> : null}
      {reply > 0 && reply < 1 ? <Packet position={along(curve, 1 - reply)} size={0.75} rotation={[t * 2, t * 3, 0]} color={C.violet} header={C.cyan} glow={1.6} /> : null}

      <HexTunnel from={TUNNEL_START} length={TUNNEL_LEN} t={t} progress={tunnel} edgeK={2 + ready * 3} />
      <TunnelRings progress={tunnel} ready={ready} />

      <DataCenter position={DC} lit={0.6 + reply * 0.4} door={Math.max(prog(t, 46.3, 46.5) * (1 - prog(t, 46.6, 47.2)), ready)} />
      <Dust t={t} count={1200} center={[0, 6, -30]} spread={[60, 24, 90]} size={0.1} />
    </Stage>
  );
};
