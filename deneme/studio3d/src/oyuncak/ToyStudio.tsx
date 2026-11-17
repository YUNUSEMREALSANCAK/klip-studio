import {Environment, Lightformer} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useLayoutEffect} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {NeutralToneMapping, PCFSoftShadowMap, Vector3} from 'three';
import {B} from '../kit2d/brand';
import {FitiToy, type FitiToyProps} from '../kit/three/FitiToy';
import type {V3} from '../kit/three/util';

/** Kamerayı hedefe çevirir, renk eşlemeyi ürün fotoğrafı gibi nötr yapar */
const Rig: React.FC<{target: V3}> = ({target}) => {
  const {camera, gl} = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.shadowMap.type = PCFSoftShadowMap;
    camera.lookAt(new Vector3(...target));
    camera.updateProjectionMatrix();
  }, [camera, gl, target]);
  return null;
};

type ToyStudioProps = {
  bg?: string;
  camera: V3;
  target: V3;
  fov?: number;
  pose?: FitiToyProps;
  /** Arka plan yerine şeffaf PNG */
  transparent?: boolean;
};

/**
 * Oyuncak fotoğraf stüdyosu: sıcak yumuşak ışık kutuları, zemine düşen yumuşak gölge.
 * Arka plan düz renk (2D katman), figür onun önünde.
 */
export const ToyStudio: React.FC<ToyStudioProps> = ({bg = B.lemon, camera, target, fov = 30, pose, transparent}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: transparent ? 'transparent' : bg}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        camera={{fov, near: 0.1, far: 100, position: camera}}
        style={{position: 'absolute', inset: 0}}
      >
        <Rig target={target} />

        <hemisphereLight args={['#fff4dc', '#e9dcc0', 0.5]} />
        <directionalLight
          position={[-4, 8, 6]}
          intensity={2.1}
          color="#fff3e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={5}
          shadow-camera-bottom={-2}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={6}
        />
        <directionalLight position={[5, 3, 5]} intensity={0.55} color="#ffe6c8" />
        <directionalLight position={[2, 5, -7]} intensity={1.6} color="#fff8ee" />

        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#2a2218']} />
          <Lightformer form="rect" intensity={2.4} color="#fff6e8" position={[-4, 5, 5]} rotation={[0, -0.6, 0]} scale={[5, 4, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#fff0dc" position={[5, 2, 4]} rotation={[0, 0.9, 0]} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 3, -6]} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={0.35} color={bg} position={[0, -2, 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
        </Environment>

        <FitiToy {...pose} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial opacity={0.22} color={B.ink} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* Profil fotoğrafı: baş + kollar, hafif 3/4 açı */
export const FitiOyuncakAvatar: React.FC<{bg?: string}> = ({bg}) => (
  <ToyStudio bg={bg} camera={[1.6, 2.85, 7.0]} target={[0.05, 2.12, 0]} fov={27} />
);

/* Tam boy karakter fotoğrafı */
export const FitiOyuncakTamBoy: React.FC<{bg?: string}> = ({bg}) => (
  <ToyStudio bg={bg} camera={[3.2, 2.4, 9.6]} target={[-0.1, 1.55, 0]} fov={28} />
);
