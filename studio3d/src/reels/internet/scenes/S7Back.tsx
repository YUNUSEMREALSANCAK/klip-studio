import React from 'react';
import {C} from '../../../kit/theme';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo} from '../../../kit/three/materials';
import {CityField, Monitor, Packet, Router} from '../../../kit/three/parts';
import {drawBrowser, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {sampleCam} from '../../../kit/three/camera';
import {prog} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 7 · "Yanıt ağ üzerinden tekrar istemciye gönderiliyor." Yüksek hızlı dönüş yolculuğu */

const LANE_Y = 2.2;
const SCREEN_Z = -362;

export const cam: CamKey[] = [
  {t: 69.1, p: [0.9, 5.4, 6], l: [0, 2.6, -24], fov: 50},
  {t: 70.9, p: [0.7, 5.2, -205], l: [0, 2.6, -250], fov: 56},
  {t: 72.4, p: [0, 2.3, SCREEN_Z + 4], l: [0, 2.3, SCREEN_Z - 20], fov: 62, ease: 'in'},
];

export const S7Back: React.FC = () => {
  const t = useSceneTime('back');
  const camZ = sampleCam(cam, t).p[2];
  const screen = useCanvasTexture(SCREEN_W, SCREEN_H, (ctx) => drawBrowser(ctx, {typed: 1, cursor: false, loading: 0.75 + prog(t, 69.1, 72.4) * 0.25, portal: prog(t, 71.4, 72.3)}));

  return (
    <Stage t={t} cam={cam} fog={0.01} bloom={1.3}>
      <GridFloor y={0} size={2} opacity={0.5} />
      <CityField count={260} inner={40} outer={300} seed={31} maxH={45} arc={[Math.PI * 0.55, Math.PI * 1.45]} center={[0, 0, -150]} />
      <CityField count={260} inner={40} outer={300} seed={32} maxH={45} arc={[-Math.PI * 0.45, Math.PI * 0.45]} center={[0, 0, -150]} />

      <Fiber t={t} points={[[0, LANE_Y, 10], [0, LANE_Y, SCREEN_Z]]} radius={0.12} base={C.violet} baseK={0.5} pulse={C.white} pulseK={5} count={60} speed={-3} width={0.15} segments={400} />
      {[-4, 4].map((x, i) => (
        <Fiber key={x} t={t + i} points={[[x, LANE_Y + 1.5, 10], [x * 1.4, LANE_Y + 3, SCREEN_Z]]} radius={0.06} base={C.blue} baseK={0.35} pulse={C.cyan} pulseK={3} count={40} speed={-2.2} segments={300} />
      ))}

      {[-60, -125, -190, -255, -315].map((z, i) => (
        <Router key={z} position={[0, LANE_Y, z]} lookup={1} lit={0.4 + 0.6 * Math.max(0, 1 - Math.abs(camZ - z) / 30)} gate={1} inYaw={0} outYaw={Math.PI} scale={0.9 + (i % 2) * 0.2} />
      ))}

      {/* Yanıt paketleri kameranın önünde akar */}
      {Array.from({length: 7}).map((_, i) => {
        const z = camZ - 9 - i * 1.6 - Math.sin(t * 3 + i) * 0.3;
        const x = ((i % 3) - 1) * 0.55;
        const y = LANE_Y + 0.15 * Math.sin(t * 4 + i * 2);
        return z > SCREEN_Z + 1 ? <Packet key={i} position={[x, y, z]} size={0.38} rotation={[t * 2 + i, t * 1.4, 0]} color={C.violet} header={C.cyan} glow={1.3} /> : null;
      })}

      {/* İstemciye varış: ekran yaklaşır ve parlar */}
      <Monitor position={[0, LANE_Y, SCREEN_Z]} scale={3.2} screen={screen} screenK={1.4 + prog(t, 71.4, 72.3) * 2} />
      <Halo position={[0, LANE_Y, SCREEN_Z - 3]} size={30} color={C.cyan} intensity={0.4 + prog(t, 71.4, 72.3)} />
      <Dust t={t} count={1200} center={[0, 6, camZ - 30]} spread={[40, 16, 120]} size={0.1} />
    </Stage>
  );
};
