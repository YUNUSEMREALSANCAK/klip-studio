import React, {useMemo} from 'react';
import {C} from '../../../kit/theme';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo, LightBeam} from '../../../kit/three/materials';
import {CityField, DataCenter, Monitor, Platform, Router, Tower} from '../../../kit/three/parts';
import {drawWebsite, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {prog, rng, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 9 · "İşte internet dediğimiz şey… devasa protokol ve sistem koordinasyonu." Büyük geri çekiliş */

/** İki nokta arasında, mesafeyle yükselen kavis */
const lift = (a: V3, b: V3, k = 0.22): V3[] => {
  const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + d * k, (a[2] + b[2]) / 2];
  return [a, m, b];
};

const HOME: V3 = [0, 2.5, 0];
const DNS_HUB: V3 = [-70, 0, -110];
const SERVER_HUB: V3 = [95, 0, -175];
const ROUTERS: V3[] = [
  [30, 6, -60],
  [60, 8, -120],
  [-30, 6, -55],
  [-110, 7, -40],
  [140, 8, -90],
  [10, 7, -150],
  [-40, 9, -190],
];

export const cam: CamKey[] = [
  {t: 82.3, p: [0, 3.4, 15.5], l: [0, 2.2, 0], fov: 42},
  {t: 84.8, p: [4, 18, 52], l: [0, 2, -20], fov: 44},
  {t: 88.9, p: [10, 85, 165], l: [10, 0, -70], fov: 46},
  {t: 92.2, p: [12, 105, 205], l: [10, 0, -80], fov: 46},
];

export const S9Finale: React.FC = () => {
  const t = useSceneTime('finale');
  const site = useCanvasTexture(SCREEN_W, SCREEN_H, drawWebsite);

  const links = useMemo(() => {
    const r = rng(101);
    const hubs: V3[] = [HOME, [DNS_HUB[0], 30, DNS_HUB[2]], [SERVER_HUB[0], 12, SERVER_HUB[2] + 6], ...ROUTERS];
    const out: {pts: V3[]; color: string; speed: number}[] = [];
    // Bu videodaki yolculuk: ev → DNS → ev → router'lar → sunucu
    out.push({pts: lift(HOME, hubs[1]), color: C.violet, speed: 0.6});
    out.push({pts: lift(HOME, ROUTERS[0]), color: C.cyan, speed: 0.9});
    out.push({pts: lift(ROUTERS[0], ROUTERS[1]), color: C.cyan, speed: 0.9});
    out.push({pts: lift(ROUTERS[1], hubs[2]), color: C.cyan, speed: 0.9});
    // İnternetin geri kalanı
    for (let i = 0; i < 26; i++) {
      const a = hubs[Math.floor(r() * hubs.length)];
      const ang = r() * Math.PI * 2;
      const dist = 80 + r() * 260;
      const b: V3 = [a[0] + Math.cos(ang) * dist, 2, a[2] + Math.sin(ang) * dist * 0.8 - 40];
      out.push({pts: lift(a, b, 0.18 + r() * 0.12), color: r() > 0.7 ? C.violet : C.blueGlow, speed: 0.3 + r() * 0.6});
    }
    for (let i = 0; i < ROUTERS.length - 1; i++) out.push({pts: lift(ROUTERS[i], ROUTERS[i + 1], 0.15), color: C.blue, speed: 0.5});
    return out;
  }, []);

  const reveal = prog(t, 83, 86.5);

  return (
    <Stage t={t} cam={cam} fog={0.0035} bloom={1.3}>
      <GridFloor y={0} size={2} opacity={0.4} />
      <CityField count={700} inner={60} outer={520} seed={41} maxH={60} />

      <Platform position={[0, 0, 0]} radius={3.2} lit={1} />
      <Monitor position={[0, 2.5, -0.085]} scale={1.3} screen={site} screenK={1.4} />
      <pointLight position={[0, 8, 6]} intensity={14} distance={20} color={C.cyan} />
      <LightBeam position={[0, 120, 0]} length={116} radius={6} color={C.cyan} intensity={0.2 * reveal} />

      {links.map((l, i) => (
        <Fiber
          key={i}
          t={t + i * 0.37}
          points={l.pts}
          radius={i < 4 ? 0.35 : 0.22}
          base={l.color}
          baseK={i < 4 ? 0.9 : 0.4}
          pulse={i < 4 ? C.white : l.color}
          pulseK={i < 4 ? 6 : 3.5}
          speed={l.speed}
          count={i < 4 ? 6 : 3}
          width={0.14}
          progress={i < 4 ? 1 : Math.min(1, reveal * 1.6 - (i % 7) * 0.08)}
          segments={96}
        />
      ))}

      {/* Videodaki duraklar: DNS kuleleri, router'lar, veri merkezi */}
      <Tower position={[DNS_HUB[0] - 12, 0, DNS_HUB[2]]} height={34} width={3.6} lit={0.4} />
      <Tower position={[DNS_HUB[0], 0, DNS_HUB[2] - 12]} height={26} width={3.2} accent={C.blueGlow} lit={0.4} />
      <Tower position={[DNS_HUB[0] + 12, 0, DNS_HUB[2]]} height={18} width={3} accent={C.violet} lit={0.4} />
      <DataCenter position={SERVER_HUB} lit={0.8} door={0.6} />
      {ROUTERS.map((p, i) => (
        <Router key={i} position={p} lookup={1} lit={0.5 + 0.5 * Math.max(0, Math.sin(t * 2 + i))} scale={1.6} />
      ))}
      <Halo position={[DNS_HUB[0], 30, DNS_HUB[2]]} size={30} color={C.violet} intensity={0.35} />
      <Halo position={[SERVER_HUB[0], 14, SERVER_HUB[2]]} size={40} color={C.cyan} intensity={0.35} />

      <Dust t={t} count={1600} center={[0, 30, -80]} spread={[400, 80, 400]} size={0.5} />
    </Stage>
  );
};
