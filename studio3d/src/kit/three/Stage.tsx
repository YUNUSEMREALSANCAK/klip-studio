import {Environment, Lightformer} from '@react-three/drei';
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {useVideoConfig} from 'remotion';
import {C} from '../theme';
import {CameraRig, sampleCam, type CamKey} from './camera';
import {Sky} from './materials';
import {Post} from './Post';

type StageProps = {
  t: number;
  cam: CamKey[];
  children: React.ReactNode;
  fog?: number;
  bloom?: number;
  /** Alan derinliği bulanıklığı (0 = kapalı). Odak her zaman kameranın baktığı noktada. */
  bokeh?: number;
  focusRange?: number;
  sway?: number;
};

/**
 * Bütün sahnelerin ortak dünyası: aynı gece mavisi atmosfer, sis, ışık düzeni,
 * yansımalar için stüdyo ışıkları ve sinematik son işlem (bloom, alan derinliği, vinyet).
 */
export const Stage: React.FC<StageProps> = ({t, cam, children, fog = 0.012, bloom = 1.1, bokeh = 0, focusRange = 12, sway = 1}) => {
  const {width, height} = useVideoConfig();
  const {l} = sampleCam(cam, t);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      gl={{antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: true}}
      camera={{fov: 38, near: 0.05, far: 4000, position: [0, 2, 10]}}
      style={{position: 'absolute', inset: 0}}
    >
      <color attach="background" args={[C.bg]} />
      <fogExp2 attach="fog" args={[C.fog, fog]} />
      <Sky />
      <CameraRig keys={cam} t={t} sway={sway} />

      <ambientLight intensity={0.4} color={C.blueGlow} />
      <hemisphereLight args={['#1b3a7a', C.bg, 0.9]} />
      <directionalLight position={[8, 18, 10]} intensity={1.2} color={'#b9d4ff'} />
      <directionalLight position={[-14, 6, -12]} intensity={0.9} color={C.violet} />

      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#01030a']} />
        <Lightformer form="rect" intensity={3} color={C.cyan} position={[0, 6, -10]} scale={[20, 1.2, 1]} />
        <Lightformer form="rect" intensity={2} color={C.blueGlow} position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[16, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color={C.violet} position={[10, 3, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[14, 2, 1]} />
        <Lightformer form="circle" intensity={4} color={C.white} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={6} />
      </Environment>

      {children}

      <Post bloom={bloom} bokeh={bokeh} focus={l} focusRange={focusRange} />
    </ThreeCanvas>
  );
};
