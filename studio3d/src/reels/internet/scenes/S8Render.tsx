import {Edges, MeshReflectorMaterial} from '@react-three/drei';
import React from 'react';
import {Color} from 'three';
import {C, hdr} from '../../../kit/theme';
import {RENDER} from '../timeline';
import type {CamKey} from '../../../kit/three/camera';
import {Dust, Fiber, GridFloor, Halo} from '../../../kit/three/materials';
import {Glow, Monitor, Packet, Platform} from '../../../kit/three/parts';
import {drawWebsite, SCREEN_H, SCREEN_W, useCanvasTexture} from '../../../kit/three/screens';
import {Stage} from '../../../kit/three/Stage';
import {clamp01, easeInOut, easeOut, lerp, lerp3, prog, type V3} from '../../../kit/three/util';
import {useSceneTime} from '../timeline';

/* Sahne 8 · Render Tree → Layout → Paint → Compositing → ekranda web sitesi */

/** Monitör ölçeği: 9:16 kadrajda ekranın tamamı görünsün */
const MON_SCALE = 1.3;
export const PAGE_CENTER: V3 = [0, 2.5, 0];
const PAGE_W = 3.36 * MON_SCALE;
const PAGE_H = 1.98 * MON_SCALE;

type Node = {
  id: string;
  parent: number;
  tree: V3;
  /** Canvas pikseli cinsinden yerleşim [x, y, w, h] (SCREEN_W x SCREEN_H) */
  rect: [number, number, number, number];
  paint: string;
  layer: number;
};

/** DOM + CSSOM'dan çıkan render ağacı; her düğümün sayfadaki yeri web sitesi dokusuyla aynı */
export const NODES: Node[] = [
  {id: 'body', parent: -1, tree: [0.0, 6.6, 0], rect: [0, 0, 1360, 800], paint: '#06102a', layer: 0},
  {id: 'header', parent: 0, tree: [-1.98, 5.5, 0], rect: [0, 0, 1360, 110], paint: '#0b1a3f', layer: 1},
  {id: 'hero', parent: 0, tree: [-0.66, 5.5, 0], rect: [80, 170, 760, 300], paint: '#0a1838', layer: 1},
  {id: 'visual', parent: 0, tree: [0.66, 5.5, 0], rect: [900, 170, 380, 300], paint: '#4f6cf7', layer: 1},
  {id: 'cards', parent: 0, tree: [1.98, 5.5, 0], rect: [80, 530, 1200, 210], paint: '#081530', layer: 1},
  {id: 'logo', parent: 1, tree: [-2.34, 4.4, 0], rect: [80, 30, 230, 52], paint: C.cyan, layer: 2},
  {id: 'nav', parent: 1, tree: [-1.62, 4.4, 0], rect: [860, 36, 470, 40], paint: '#13265a', layer: 2},
  {id: 'title1', parent: 2, tree: [-1.02, 4.4, 0], rect: [80, 200, 420, 70], paint: C.white, layer: 2},
  {id: 'title2', parent: 2, tree: [-0.66, 4.4, 0], rect: [80, 290, 470, 70], paint: C.cyan, layer: 2},
  {id: 'sub', parent: 2, tree: [-0.3, 4.4, 0], rect: [80, 385, 560, 30], paint: '#9fb3d9', layer: 2},
  {id: 'card1', parent: 4, tree: [1.5, 4.4, 0], rect: [80, 530, 380, 210], paint: '#0e2049', layer: 2},
  {id: 'card2', parent: 4, tree: [1.98, 4.4, 0], rect: [490, 530, 380, 210], paint: '#1a1d5a', layer: 2},
  {id: 'card3', parent: 4, tree: [2.46, 4.4, 0], rect: [900, 530, 380, 210], paint: '#0e2049', layer: 2},
  {id: 'nav1', parent: 6, tree: [-1.92, 3.3, 0], rect: [860, 40, 120, 30], paint: '#9fb3d9', layer: 3},
  {id: 'nav2', parent: 6, tree: [-1.62, 3.3, 0], rect: [1030, 40, 120, 30], paint: '#9fb3d9', layer: 3},
  {id: 'nav3', parent: 6, tree: [-1.32, 3.3, 0], rect: [1200, 40, 120, 30], paint: '#9fb3d9', layer: 3},
];

const depth = (n: Node): number => (n.parent < 0 ? 0 : 1 + depth(NODES[n.parent]));

/** Sayfa düzlemindeki merkez ve boyut (dünya birimi) */
const pageRect = (r: Node['rect']) => {
  const [x, y, w, h] = r;
  const cx = PAGE_CENTER[0] + ((x + w / 2) / SCREEN_W - 0.5) * PAGE_W;
  const cy = PAGE_CENTER[1] + (0.5 - (y + h / 2) / SCREEN_H) * PAGE_H;
  return {pos: [cx, cy, PAGE_CENTER[2]] as V3, size: [(w / SCREEN_W) * PAGE_W, (h / SCREEN_H) * PAGE_H] as [number, number]};
};

export const cam: CamKey[] = [
  {t: 72.2, p: [0, 4.6, 15], l: [0, 5.6, 0], fov: 42},
  {t: 73.9, p: [0, 5.2, 12.5], l: [0, 5.0, 0], fov: 42},
  {t: 75.0, p: [0, 3.4, 11.6], l: [0, 3.1, 0], fov: 42},
  {t: 76.2, p: [0.3, 2.9, 11.4], l: [0, 2.55, 0], fov: 42},
  {t: 77.3, p: [7.2, 4.6, 7.6], l: [0, 2.55, 0.5], fov: 42},
  {t: 78.4, p: [5.8, 3.8, 9.2], l: [0, 2.55, 0.4], fov: 42},
  {t: 79.5, p: [1.4, 2.9, 11.6], l: [0, 2.5, 0], fov: 42},
  {t: 80.9, p: [0, 2.7, 11.2], l: [0, 2.4, 0], fov: 42},
  {t: 82.5, p: [0, 3.4, 15.5], l: [0, 2.2, 0], fov: 42},
];

export const S8Render: React.FC = () => {
  const t = useSceneTime('render');
  const site = useCanvasTexture(SCREEN_W, SCREEN_H, drawWebsite);

  const arrive = easeInOut(prog(t, 72.2, 73.6));
  const seed = prog(t, 73.3, 73.9);
  const layout = easeInOut(prog(t, RENDER.layout - 0.1, RENDER.layout + 0.55));
  const explode = easeInOut(prog(t, RENDER.compositing, RENDER.compositing + 0.8)) * (1 - easeInOut(prog(t, 78.0, 78.9)));
  const monitorIn = easeOut(prog(t, RENDER.site - 0.1, RENDER.site + 0.9));
  const siteOn = easeInOut(prog(t, RENDER.site + 0.6, RENDER.reveal));

  return (
    <Stage t={t} cam={cam} fog={0.02} bloom={1.15} bokeh={t > 76.8 && t < 78.6 ? 2.5 : 0} focusRange={4}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={3} blur={[300, 80]} roughness={0.85} color="#040916" metalness={0.5} mirror={0.6} />
      </mesh>
      <GridFloor y={0.005} size={1} opacity={0.45} />
      <Platform position={[0, 0, 0]} radius={3.2} lit={0.4 + siteOn * 0.6} />
      <pointLight position={[0, 8, 6]} intensity={14} distance={20} color={C.cyan} />

      {/* Yanıt paketleri tarayıcı motoruna ulaşır ve HTML belgesine dönüşür */}
      {seed < 1
        ? Array.from({length: 6}).map((_, i) => {
            const from: V3 = [((i % 3) - 1) * 1.4, 2.5 + Math.floor(i / 3) * 1.2, 18];
            const pos = lerp3(from, NODES[0].tree, arrive);
            return <Packet key={i} position={pos} size={0.4 * (1 - seed)} rotation={[t * 2 + i, t, 0]} color={C.violet} header={C.cyan} glow={1.3} />;
          })
        : null}
      {seed > 0 && seed < 1 ? <Halo position={NODES[0].tree} size={3} color={C.cyan} intensity={0.9 * (1 - seed)} /> : null}

      {/* Render ağacı: düğümler seviye seviye büyür, sonra sayfa katmanlarına dönüşür */}
      {NODES.map((n, i) => {
        const d = depth(n);
        const grow = easeOut(prog(t, RENDER.tree - 0.2 + d * 0.28, RENDER.tree + 0.15 + d * 0.28));
        if (grow <= 0) return null;
        const pr = pageRect(n.rect);
        const ly = n.rect[1] / SCREEN_H;
        const paint = easeOut(prog(t, RENDER.paint - 0.05 + ly * 0.45, RENDER.paint + 0.3 + ly * 0.45));
        const z = PAGE_CENTER[2] + 0.05 * monitorIn + (n.layer * 0.015 + explode * n.layer * 0.7);
        const pos: V3 = [lerp(n.tree[0], pr.pos[0], layout), lerp(n.tree[1], pr.pos[1], layout), lerp(n.tree[2], z, layout)];
        const sx = lerp(0.3, pr.size[0], layout) * grow;
        const sy = lerp(0.3, pr.size[1], layout) * grow;
        const sz = lerp(0.3, 0.03, layout) * grow;
        const edge = n.layer === 0 ? C.blueGlow : n.layer === 1 ? C.cyan : n.layer === 2 ? C.violet : C.white;
        const fill = new Color(C.navy2).lerp(new Color(n.paint), paint);
        const fade = 1 - siteOn;
        if (fade <= 0.001) return null;
        return (
          <group key={n.id}>
            <mesh position={pos} scale={[sx, sy, sz]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color={fill}
                emissive={fill}
                emissiveIntensity={0.3 + paint * 0.9}
                metalness={0.3}
                roughness={0.35}
                transparent
                opacity={(layout < 1 ? lerp(0.9, 0.25, layout) : 0.25) * (1 - paint) + paint * 0.96 * fade}
                toneMapped={false}
              />
              <Edges threshold={15} color={hdr(edge, (2.4 - paint * 1.4) * fade)} />
            </mesh>
            {n.parent >= 0 && layout < 1 ? (
              <Fiber
                t={t}
                points={[NODES[n.parent].tree, [lerp(NODES[n.parent].tree[0], n.tree[0], 0.5), lerp(NODES[n.parent].tree[1], n.tree[1], 0.5) + 0.1, 0], n.tree]}
                radius={0.025}
                base={edge}
                baseK={0.8}
                pulse={C.white}
                pulseK={3}
                count={1}
                speed={1.2}
                progress={grow}
                opacity={1 - layout}
                segments={24}
              />
            ) : null}
          </group>
        );
      })}

      {/* Son: monitör gelir, birleşen katmanlar gerçek web sitesine dönüşür */}
      {monitorIn > 0 ? (
        <group position={[0, lerp(-7, 0, monitorIn), 0]}>
          <Monitor position={[PAGE_CENTER[0], PAGE_CENTER[1], PAGE_CENTER[2] - 0.065 * MON_SCALE]} scale={MON_SCALE} screen={siteOn > 0 ? site : null} screenK={0.3 + siteOn * 1.1} />
        </group>
      ) : null}
      {siteOn > 0 && siteOn < 1 ? <Halo position={[0, 2.5, 0.4]} size={7} color={C.cyan} intensity={1.2 * Math.sin(siteOn * Math.PI)} /> : null}
      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[40, 20]} />
        <Glow color={C.navy} k={0.6 * clamp01(1 - siteOn)} opacity={0.5} />
      </mesh>

      <Dust t={t} count={700} center={[0, 5, -2]} spread={[30, 14, 24]} size={0.05} />
    </Stage>
  );
};
