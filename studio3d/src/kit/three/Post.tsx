import {useFrame, useThree} from '@react-three/fiber';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {useDelayRender, useRemotionEnvironment} from 'remotion';
import {HalfFloatType, NoToneMapping, Vector2, Vector3} from 'three';
import type {V3} from './util';

type PostProps = {bloom: number; bokeh: number; focus: V3; focusRange: number};

/**
 * Bazı kamera açılarında tek bir piksel geçersiz (NaN/sonsuz) değer üretebiliyor;
 * bloom bunu bütün ekrana yayıp kareyi karartıyordu. Bu filtre o pikselleri temizler.
 */
class SanitizeEffect extends Effect {
  constructor() {
    super(
      'SanitizeEffect',
      `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 c = inputColor;
        bool bad = any(isnan(c)) || any(isinf(c)) || !(c.r >= 0.0 || c.r < 0.0);
        outputColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, vec4(0.0), vec4(48.0));
      }`,
      {blendFunction: BlendFunction.SET},
    );
  }
}

/**
 * Sinematik son işlem: alan derinliği → bloom + vinyet + renk sapması → AgX ton eşleme → SMAA.
 * @react-three/postprocessing, Remotion'un kare kare render'ında siyah kare verdiği için
 * composer doğrudan postprocessing kütüphanesiyle kuruluyor.
 */
export const Post: React.FC<PostProps> = ({bloom, bokeh, focus, focusRange}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, {frameBufferType: HalfFloatType});
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new SanitizeEffect()));
    const dof = new DepthOfFieldEffect(camera, {worldFocusDistance: 10, worldFocusRange: 10, bokehScale: 0});
    dof.target = new Vector3();
    const dofPass = new EffectPass(camera, dof);
    const bloomFx = new BloomEffect({mipmapBlur: true, intensity: 1, luminanceThreshold: 0.85, luminanceSmoothing: 0.2, radius: 0.78});
    composer.addPass(dofPass);
    composer.addPass(new EffectPass(camera, bloomFx, new VignetteEffect({offset: 0.28, darkness: 0.72})));
    composer.addPass(new EffectPass(camera, new ChromaticAberrationEffect({offset: new Vector2(0.0007, 0.0007), radialModulation: true, modulationOffset: 0.35})));
    composer.addPass(new EffectPass(camera, new ToneMappingEffect({mode: ToneMappingMode.AGX})));
    composer.addPass(new EffectPass(camera, new SMAAEffect()));
    return {composer, dof, dofPass, bloomFx};
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    gl.toneMapping = NoToneMapping;
    fx.composer.setSize(size.width, size.height);
  }, [fx, size, gl]);

  useEffect(() => () => fx.composer.dispose(), [fx]);

  // Sahne yeni açıldığında ilk kare boş kalabiliyordu: her şey hazır olduktan sonra bir kez daha çiz
  const advance = useThree((s) => s.advance);
  const {isRendering} = useRemotionEnvironment();
  const {delayRender, continueRender} = useDelayRender();
  useLayoutEffect(() => {
    if (!isRendering) return;
    const handle = delayRender('3D sahnenin ilk karesi çiziliyor');
    const id = setTimeout(() => {
      advance(performance.now());
      continueRender(handle);
    }, 0);
    return () => {
      clearTimeout(id);
      continueRender(handle);
    };
  }, [advance, isRendering, delayRender, continueRender]);

  fx.bloomFx.intensity = bloom;
  // Geçiş hep açık kalır: kapatıp açınca boyutu güncellenmiyor ve görüntüyü kaydırıyordu
  fx.dofPass.enabled = true;
  fx.dof.bokehScale = bokeh;
  fx.dof.cocMaterial.worldFocusRange = focusRange;
  fx.dof.target!.set(focus[0], focus[1], focus[2]);

  useFrame((_, delta) => {
    fx.composer.render(delta);
  }, 1);

  return null;
};
