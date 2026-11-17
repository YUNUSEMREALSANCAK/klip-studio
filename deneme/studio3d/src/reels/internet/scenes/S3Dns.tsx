import {MeshReflectorMaterial} from '@react-three/drei';
import React, {useMemo} from 'react';
import {C} from '../../../kit/theme';
import {DNS} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo, LightBeam} from '../../../kit/three/materials';
import {CityField, Crystal, Glow, Metal, Monitor, Platform, Tower} from '../../../kit/three/parts';
import {drawBrowser, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {along, easeInOut, easeOut, lerp3, makeCurve, prog, pulse, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 3 · DNS: önbellekler → Recursive Resolver → Root → TLD → Authoritative → IP adresi */

const RES: V3 = [0, 6.5, -34];
const BROWSER_CACHE: V3 = [-3.6, 0, -1.6];
const OS_CACHE: V3 = [3.6, 0, -1.6];
const MON: V3 = [0, 1.24, 0];
const HOVER: V3 = [0, 1.5, 1.1];

const TOWERS = {
  root: {pos: [-18, 0, -64] as V3, h: 34, w: 3.6, accent: C.cyan},
  tld: {pos: [0, 0, -76] as V3, h: 26, w: 3.2, accent: C.blueGlow},
  auth: {pos: [18, 0, -64] as V3, h: 18, w: 3, accent: C.violet},
};
const top = (k: keyof typeof TOWERS): V3 => [TOWERS[k].pos[0], TOWERS[k].h + 1.6, TOWERS[k].pos[2]];

const CLIENT_PATH: V3[] = [[0, 1.3, -0.6], [0, 0.6, -8], [0, 0.7, -20], [0, 3.4, -29], [0, 6.5, -32.6]];
const ROOT_PATH: V3[] = [RES, [-5, 14, -42], [-13, 28, -56], top('root')];
const TLD_PATH: V3[] = [RES, [0, 13, -50], [0, 23, -66], top('tld')];
const AUTH_PATH: V3[] = [RES, [6, 10, -45], [14, 16, -57], top('auth')];

/* Zaman çizelgesi (global sn) */
const Q = {
  toBrowser: [16.05, 16.7],
  scanBrowser: [16.7, 17.5],
  toOs: [17.6, 18.15],
  scanOs: [18.15, 18.95],
  toResolver: [20.9, 23.3],
  toRoot: [25.6, 26.95],
  rootBack: [27.2, 27.75],
  toTld: [27.75, 28.3],
  tldBack: [28.45, 28.95],
  toAuth: [28.95, 29.6],
  ipBack: [30.6, 32.8],
  ipHome: [33.6, 35.4],
};

/** Önbellek kasası: çekmeceler + tarayan lazer + "bulunamadı" sönmesi */
const CacheVault: React.FC<{pos: V3; scan: number; miss: number; accent: string}> = ({pos, scan, miss, accent}) => {
  const drawers = 8;
  const scanning = scan > 0 && scan < 1;
  const laserY = 0.35 + scan * 2.1;
  return (
    <group position={pos}>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[1.7, 2.6, 1.2]} />
        <Metal color="#0a1430" rough={0.25} />
      </mesh>
      {Array.from({length: drawers}).map((_, i) => {
        const y = 0.35 + i * 0.28;
        const hit = scanning && Math.abs(laserY - y) < 0.2 ? 1 : 0;
        const k = (0.22 + hit * 2.6) * (1 - miss * 0.6) + miss * pulse(miss, 0, 0.6, 0.15) * 2.4;
        return (
          <mesh key={i} position={[0, y, 0.61]}>
            <boxGeometry args={[1.45, 0.06, 0.03]} />
            <Glow color={miss > 0.05 ? C.violet : accent} k={k} />
          </mesh>
        );
      })}
      {scanning ? (
        <>
          <mesh position={[0, laserY, 0.66]}>
            <boxGeometry args={[1.9, 0.025, 0.02]} />
            <Glow color={C.white} k={6} />
          </mesh>
          <Halo position={[0, laserY, 0.7]} size={1.4} color={accent} intensity={1.5} />
        </>
      ) : null}
      <mesh position={[0, 2.66, 0]}>
        <boxGeometry args={[1.76, 0.06, 1.26]} />
        <Glow color={miss > 0.5 ? C.violet : accent} k={1.2 * (1 - miss * 0.5)} />
      </mesh>
    </group>
  );
};

/** Recursive DNS Resolver: dikey halka, dönen segmentler, parlayan çekirdek */
const Resolver: React.FC<{t: number; power: number}> = ({t, power}) => {
  const segs = 24;
  return (
    <group position={RES}>
      <mesh position={[0, -6.5 + 0.4, 0]}>
        <cylinderGeometry args={[4.2, 4.8, 0.8, 8]} />
        <Metal />
      </mesh>
      <mesh position={[0, -6.5 + 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 3.8, 8]} />
        <Glow color={C.cyan} k={1 + power * 2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.6, -3, 0]}>
          <boxGeometry args={[0.6, 7, 0.9]} />
          <Metal color="#0b1630" />
        </mesh>
      ))}
      <mesh>
        <torusGeometry args={[5, 0.32, 16, 96]} />
        <Metal color="#0c1a3a" rough={0.18} metal={0.95} />
      </mesh>
      <mesh>
        <torusGeometry args={[5, 0.08, 8, 128]} />
        <Glow color={C.cyan} k={1.5 + power * 4} />
      </mesh>
      <group rotation={[0, 0, t * (0.3 + power * 1.6)]}>
        {Array.from({length: segs}).map((_, i) => {
          const a = (i / segs) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 5.9, Math.sin(a) * 5.9, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.5, 0.18, 0.5]} />
              <Glow color={i % 6 === 0 ? C.violet : C.blueGlow} k={0.8 + power * 3} />
            </mesh>
          );
        })}
      </group>
      <group rotation={[t * 0.4, t * 0.7, 0]}>
        <mesh>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial color={C.navy2} metalness={0.9} roughness={0.2} wireframe />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.5 + power * 0.1, 32, 32]} />
        <Glow color={C.cyanSoft} k={1.1 + power * 1.4} />
      </mesh>
      <Halo size={3 + power * 2} color={C.cyan} intensity={0.28 + power * 0.32} />
    </group>
  );
};

/** DNS sorgusu: mor parlayan küçük kristal */
const Query: React.FC<{pos: V3; t: number; glow?: number}> = ({pos, t, glow = 1}) => (
  <group position={pos} rotation={[t * 2, t * 3, 0]}>
    <mesh>
      <icosahedronGeometry args={[0.28, 0]} />
      <Glow color={C.purple} k={3.5 * glow} />
    </mesh>
    <Halo size={1.6 * glow} color={C.violet} intensity={1.6 * glow} />
  </group>
);

export const cam: CamKey[] = [
  {t: 14.2, p: [12, 15, 24], l: [0, 9, -40], fov: 42},
  {t: 16.0, p: [0, 4.6, 9.5], l: [0, 1.4, -1], fov: 40},
  {t: 17.2, p: [-2.3, 3.0, 5.2], l: [-2.6, 1.4, -1.4], fov: 40},
  {t: 18.6, p: [2.3, 3.0, 5.2], l: [2.6, 1.4, -1.4], fov: 40},
  {t: 20.5, p: [0, 3.2, 6.2], l: [0, 1.5, -2], fov: 40},
  {t: 21.6, p: [0.9, 2.2, -4.5], l: [0, 1.0, -15], fov: 46},
  {t: 22.7, p: [1.4, 2.8, -17], l: [0, 5, -31], fov: 46},
  {t: 23.8, p: [7, 7.5, -21], l: [0, 6.5, -34], fov: 42},
  {t: 25.0, p: [16, 13, -12], l: [-2, 15, -54], fov: 44},
  {t: 26.8, p: [9, 21, -18], l: [-8, 24, -58], fov: 44},
  {t: 28.6, p: [0, 25, -12], l: [0, 19, -62], fov: 46},
  {t: 30.4, p: [-7, 19, -20], l: [9, 15, -56], fov: 44},
  {t: 32.7, p: [5, 10.5, -19], l: [0, 6.5, -34], fov: 42},
  {t: 34.3, p: [2.2, 4.0, -9], l: [0, 1.8, -16], fov: 44},
  {t: 35.7, p: [0.9, 1.9, 4.6], l: [0, 1.5, 1.1], fov: 36},
  {t: 37.9, p: [0.35, 1.65, 3.2], l: [0, 1.5, 1.1], fov: 34},
];

export const S3Dns: React.FC = () => {
  const t = useSceneTime('dns');

  const curves = useMemo(
    () => ({client: makeCurve(CLIENT_PATH), root: makeCurve(ROOT_PATH), tld: makeCurve(TLD_PATH), auth: makeCurve(AUTH_PATH)}),
    [],
  );

  const screen = useCanvasTexture(SCREEN_W, SCREEN_H, (ctx) => drawBrowser(ctx, {typed: 1, cursor: false, loading: 0.15 + prog(t, 14.2, 37) * 0.3, portal: 0.15}));

  // Sorgunun konumu (zamana göre durak durak)
  const p = (k: keyof typeof Q) => easeInOut(prog(t, Q[k][0], Q[k][1]));
  let qPos: V3 = MON;
  let qVisible = t > 15.9;
  const cacheB: V3 = [BROWSER_CACHE[0], 1.5, BROWSER_CACHE[2] + 0.9];
  const cacheO: V3 = [OS_CACHE[0], 1.5, OS_CACHE[2] + 0.9];
  if (t < Q.toBrowser[1]) qPos = lerp3(MON, cacheB, p('toBrowser'));
  else if (t < Q.toOs[0]) qPos = cacheB;
  else if (t < Q.scanOs[0]) qPos = lerp3(cacheB, cacheO, p('toOs'));
  else if (t < 19.1) qPos = cacheO;
  else if (t < Q.toResolver[0]) qPos = lerp3(cacheO, [0, 1.3, -0.6], easeInOut(prog(t, 19.1, 20.6)));
  else if (t < Q.toResolver[1]) qPos = along(curves.client, p('toResolver'));
  else if (t < Q.toRoot[0]) qPos = RES;
  else if (t < Q.rootBack[0]) qPos = along(curves.root, p('toRoot'));
  else if (t < Q.toTld[0]) qPos = along(curves.root, 1 - p('rootBack'));
  else if (t < Q.tldBack[0]) qPos = along(curves.tld, p('toTld'));
  else if (t < Q.toAuth[0]) qPos = along(curves.tld, 1 - p('tldBack'));
  else if (t < 30.4) qPos = along(curves.auth, p('toAuth'));
  else qVisible = false;
  const qGlow = t > 19 && t < 20.6 ? 0.7 + 0.3 * Math.sin(t * 10) : 1;

  // IP kristali: Authoritative → Resolver → istemci
  let ipPos: V3 = top('auth');
  if (t < Q.ipBack[1]) ipPos = along(curves.auth, 1 - p('ipBack'));
  else if (t < Q.ipHome[0]) ipPos = RES;
  else if (t < Q.ipHome[1]) ipPos = along(curves.client, 1 - p('ipHome'));
  else ipPos = lerp3([0, 1.3, -0.6], HOVER, easeOut(prog(t, Q.ipHome[1], Q.ipHome[1] + 0.8)));
  const ipVisible = t > 30.3;
  const ipFound = pulse(t, DNS.found - 0.1, DNS.found + 0.9, 0.2);

  const missB = prog(t, Q.scanBrowser[1], Q.scanBrowser[1] + 0.3);
  const missO = prog(t, Q.scanOs[1], Q.scanOs[1] + 0.3);
  const resPower = Math.max(prog(t, 22.8, 23.8) * (1 - prog(t, 36, 37)), ipFound);

  const litRoot = pulse(t, 26.85, 27.9, 0.15);
  const litTld = pulse(t, 28.2, 29.0, 0.15);
  const litAuth = pulse(t, 29.5, 31.2, 0.2);

  const fiberOn = (a: number) => easeOut(prog(t, a, a + 0.8));

  return (
    <Stage t={t} cam={cam} fog={0.0085} bloom={1.2} bokeh={t > 35.2 ? 4 : 0} focusRange={1.5}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[600, 600]} />
        <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={2.5} blur={[300, 80]} roughness={0.9} color="#040916" metalness={0.5} mirror={0.5} />
      </mesh>
      <GridFloor y={0.005} size={2} opacity={0.55} />
      <CityField count={320} inner={95} outer={320} seed={7} maxH={55} />

      {/* İstemci: bilgisayar + iki önbellek */}
      <Platform position={[0, 0, 0]} radius={2.4} lit={0.6} />
      <Monitor position={MON} scale={0.5} screen={screen} screenK={1.4} />
      <CacheVault pos={BROWSER_CACHE} scan={prog(t, Q.scanBrowser[0], Q.scanBrowser[1])} miss={missB} accent={C.cyan} />
      <CacheVault pos={OS_CACHE} scan={prog(t, Q.scanOs[0], Q.scanOs[1])} miss={missO} accent={C.blueGlow} />
      <pointLight position={[0, 4, 3]} intensity={8} distance={14} color={C.cyan} />

      {/* Kablolar */}
      <Fiber t={t} points={CLIENT_PATH} radius={0.09} progress={Math.max(0.03, fiberOn(20.6))} head={t < 21.6 ? 1 : 0} pulseK={t > 20.9 ? 6 : 2} speed={1.2} />
      <Fiber t={t} points={ROOT_PATH} radius={0.09} progress={fiberOn(25.4)} head={0} base={C.cyan} pulse={C.cyan} pulseK={3 + litRoot * 5} />
      <Fiber t={t} points={TLD_PATH} radius={0.09} progress={fiberOn(27.6)} head={0} base={C.blueGlow} pulse={C.blueGlow} pulseK={3 + litTld * 5} />
      <Fiber t={t} points={AUTH_PATH} radius={0.09} progress={fiberOn(28.8)} head={0} base={C.violet} pulse={C.purple} pulseK={3 + litAuth * 5} />

      <Resolver t={t} power={resPower} />
      <Tower position={TOWERS.root.pos} height={TOWERS.root.h} width={TOWERS.root.w} accent={TOWERS.root.accent} lit={litRoot} beam={litRoot} />
      <Tower position={TOWERS.tld.pos} height={TOWERS.tld.h} width={TOWERS.tld.w} accent={TOWERS.tld.accent} lit={litTld} beam={litTld} />
      <Tower position={TOWERS.auth.pos} height={TOWERS.auth.h} width={TOWERS.auth.w} accent={TOWERS.auth.accent} lit={Math.max(litAuth, prog(t, 29.4, 29.8) * (1 - prog(t, 32, 33)) * 0.5)} beam={litAuth} />
      <LightBeam position={[0, 60, -64]} length={58} radius={30} color={C.blue} intensity={0.05} />

      {qVisible ? <Query pos={qPos} t={t} glow={qGlow} /> : null}
      {ipVisible ? <Crystal position={ipPos} size={t > Q.ipHome[1] ? 0.32 : 0.55} spin={t * 0.9} glow={1 + ipFound * 1.5} /> : null}

      <Dust t={t} count={1400} center={[0, 10, -30]} spread={[90, 40, 110]} size={0.12} />
    </Stage>
  );
};

