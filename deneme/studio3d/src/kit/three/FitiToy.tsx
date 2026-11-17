import {RoundedBox} from '@react-three/drei';
import React, {useMemo} from 'react';
import {BufferGeometry, CatmullRomCurve3, QuadraticBezierCurve3, Vector3} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {B} from '../../kit2d/brand';

/*
 * Fiti oyuncak sürümü: plastikten dökülmüş bir aksiyon figürü.
 * Kafa F klavye tuşu, boyun tuş sapı (+), omuz/dirsek/kalça eklem topları, boyalı yüz.
 * Zemin y = 0, birim ≈ 1 tuş genişliğinin yarısı.
 */

/* ---------- Malzemeler ---------- */

type Finish = 'plastic' | 'matte' | 'gloss' | 'fabric' | 'metal';

const FINISH: Record<Finish, Record<string, number>> = {
  plastic: {roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2},
  matte: {roughness: 0.62, clearcoat: 0},
  gloss: {roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03},
  fabric: {roughness: 0.95, sheen: 1, sheenRoughness: 0.45},
  metal: {roughness: 0.22, metalness: 1},
};

const Mat: React.FC<{color: string; finish?: Finish}> = ({color, finish = 'plastic'}) => (
  <meshPhysicalMaterial color={color} sheenColor="#ffffff" {...FINISH[finish]} />
);

/** Gölge alan ve düşüren mesh */
const Part: React.FC<React.ComponentProps<'mesh'>> = (props) => <mesh castShadow receiveShadow {...props} />;

/* ---------- Konik yuvarlak kutu (tuş başlığı biçimi) ---------- */

/**
 * Alttan üste daralan yuvarlak köşeli kutu. Normaller daraltmanın Jacobian'ı ile
 * düzeltilir, böylece köşelerde kırık gölge oluşmaz.
 */
const taperedBox = (w: number, h: number, d: number, topW: number, topD: number, radius: number): BufferGeometry => {
  const g = new RoundedBoxGeometry(w, h, d, 6, radius);
  const ax = topW / w - 1;
  const az = topD / d - 1;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + h / 2) / h;
    const sx = 1 + ax * t;
    const sz = 1 + az * t;
    const nx = nor.getX(i) / sx;
    const nz = nor.getZ(i) / sz;
    const ny = nor.getY(i) - ((x * ax) / h) * nx - ((z * az) / h) * nz;
    const len = Math.hypot(nx, ny, nz);
    pos.setXYZ(i, x * sx, y, z * sz);
    nor.setXYZ(i, nx / len, ny / len, nz / len);
  }
  return g;
};

/* Kafa ölçüleri */
const HEAD = {w: 2.0, h: 1.45, d: 1.8, topW: 1.55, topD: 1.4, r: 0.2};
const headHalfDepth = (t: number) => (HEAD.d / 2) * (1 + (HEAD.topD / HEAD.d - 1) * t);
const headY = (t: number) => -HEAD.h / 2 + t * HEAD.h;
/** Ön yüzün geriye yatma açısı */
const FACE_TILT = Math.atan(((HEAD.d - HEAD.topD) / 2) / HEAD.h);

/** Ön yüze yapışık grup: t = kafa yüksekliğinde oran, lift = yüzeyden kalkma */
const OnFace: React.FC<{t: number; lift?: number; scale?: number; children: React.ReactNode}> = ({t, lift = 0, scale = 1, children}) => (
  <group position={[0, headY(t), headHalfDepth(t) * scale + lift]} rotation={[-FACE_TILT, 0, 0]}>
    {children}
  </group>
);

/* ---------- Yüz ---------- */

const Eye: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 0, 0]}>
    <Part scale={[1, 1.36, 0.42]}>
      <sphereGeometry args={[0.165, 48, 32]} />
      <Mat color={B.ink} finish="gloss" />
    </Part>
    <mesh position={[0.055, 0.08, 0.06]} scale={[1, 1, 0.4]}>
      <sphereGeometry args={[0.048, 24, 16]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <mesh position={[-0.05, -0.08, 0.06]} scale={[1, 1, 0.4]}>
      <sphereGeometry args={[0.02, 16, 12]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>
);

const Cheek: React.FC<{x: number}> = ({x}) => (
  <mesh position={[x, 0, 0.004]} scale={[1, 0.56, 1]} rotation={[Math.PI / 2, 0, 0]}>
    <cylinderGeometry args={[0.15, 0.15, 0.012, 40]} />
    <Mat color={B.cheek} finish="matte" />
  </mesh>
);

const Smile: React.FC = () => {
  const curve = useMemo(() => new QuadraticBezierCurve3(new Vector3(-0.13, 0.03, 0), new Vector3(0, -0.11, 0), new Vector3(0.13, 0.03, 0)), []);
  return (
    <Part>
      <tubeGeometry args={[curve, 40, 0.03, 12, false]} />
      <Mat color={B.ink} finish="gloss" />
    </Part>
  );
};

/* ---------- Kafa: F tuşu ---------- */

const LetterF: React.FC = () => (
  <group>
    <RoundedBox args={[0.055, 0.22, 0.04]} radius={0.015} position={[-0.04, 0, 0]} castShadow>
      <Mat color={B.ink} />
    </RoundedBox>
    <RoundedBox args={[0.15, 0.052, 0.04]} radius={0.015} position={[0.02, 0.084, 0]} castShadow>
      <Mat color={B.ink} />
    </RoundedBox>
    <RoundedBox args={[0.11, 0.05, 0.04]} radius={0.015} position={[0.0, 0.0, 0]} castShadow>
      <Mat color={B.ink} />
    </RoundedBox>
  </group>
);

const BAND = {from: 0.64, to: 0.86, grow: 1.035};

const Head: React.FC = () => {
  const {w, h, d, topW, topD, r} = HEAD;
  const cap = useMemo(() => taperedBox(w, h, d, topW, topD, r), [w, h, d, topW, topD, r]);
  const band = useMemo(() => {
    const k = (t: number) => 1 + (topW / w - 1) * t;
    const kd = (t: number) => 1 + (topD / d - 1) * t;
    const bh = (BAND.to - BAND.from) * h;
    const g = BAND.grow;
    return taperedBox(w * k(BAND.from) * g, bh, d * kd(BAND.from) * g, w * k(BAND.to) * g, d * kd(BAND.to) * g, 0.12);
  }, [w, h, d, topW, topD]);
  const bandMid = (BAND.from + BAND.to) / 2;

  return (
    <group>
      <Part geometry={cap}>
        <Mat color={B.orange} />
      </Part>
      <Part geometry={band} position={[0, headY(bandMid), 0]}>
        <Mat color={B.mint} finish="fabric" />
      </Part>
      {/* F tuşunun kabartma çizgisi (homing bump) */}
      <Part position={[0, h / 2 + 0.012, 0.22]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.035, 0.2, 8, 16]} />
        <Mat color={B.bump} />
      </Part>
      <OnFace t={bandMid} scale={BAND.grow} lift={0.012}>
        <LetterF />
      </OnFace>
      <OnFace t={0.46} lift={0.0}>
        <Eye x={-0.32} />
        <Eye x={0.32} />
      </OnFace>
      <OnFace t={0.25} lift={0.0}>
        <Cheek x={-0.6} />
        <Cheek x={0.6} />
      </OnFace>
      <OnFace t={0.2} lift={0.012}>
        <Smile />
      </OnFace>
    </group>
  );
};

/* ---------- Gövde ---------- */

/** Klavye tuş sapı (+) biçiminde boyun */
const Stem: React.FC = () => (
  <group>
    <RoundedBox args={[0.34, 0.22, 0.1]} radius={0.02} castShadow>
      <Mat color={B.ink3} />
    </RoundedBox>
    <RoundedBox args={[0.1, 0.22, 0.34]} radius={0.02} castShadow>
      <Mat color={B.ink3} />
    </RoundedBox>
  </group>
);

const Torso: React.FC = () => {
  const shirt = useMemo(() => taperedBox(1.0, 0.86, 0.66, 1.22, 0.72, 0.28), []);
  return (
    <group>
      <Part geometry={shirt}>
        <Mat color={B.ink2} />
      </Part>
      {/* Atlet askıları */}
      {[-1, 1].map((s) => (
        <Part key={s} position={[s * 0.4, 0.04, 0.355]} rotation={[0.06, 0, s * 0.1]}>
          <capsuleGeometry args={[0.03, 0.5, 6, 12]} />
          <Mat color={B.mint} />
        </Part>
      ))}
    </group>
  );
};

const Shorts: React.FC = () => {
  const g = useMemo(() => taperedBox(1.04, 0.36, 0.68, 1.0, 0.64, 0.12), []);
  return (
    <group>
      <Part geometry={g}>
        <Mat color={B.ink3} />
      </Part>
      {[-1, 1].map((s) => (
        <Part key={s} position={[s * 0.515, -0.02, 0]} rotation={[0, 0, s * 0.06]}>
          <boxGeometry args={[0.02, 0.3, 0.12]} />
          <Mat color={B.mint} />
        </Part>
      ))}
    </group>
  );
};

/** Eklem topu: üst üste iki ton, ortada ince yuva çizgisi */
const Joint: React.FC<{r: number; color?: string}> = ({r, color = B.orangeDark}) => (
  <Part>
    <sphereGeometry args={[r, 40, 28]} />
    <Mat color={color} />
  </Part>
);

/** Oyuncak vidası: yıldız başlı, gümüş */
const Screw: React.FC = () => (
  <group rotation={[Math.PI / 2, 0, 0]}>
    <Part>
      <cylinderGeometry args={[0.05, 0.055, 0.025, 28]} />
      <Mat color="#cfcdd8" finish="metal" />
    </Part>
    {[0, Math.PI / 2].map((r) => (
      <mesh key={r} position={[0, 0.013, 0]} rotation={[0, r, 0]}>
        <boxGeometry args={[0.065, 0.006, 0.012]} />
        <meshStandardMaterial color="#4a4658" metalness={1} roughness={0.4} />
      </mesh>
    ))}
  </group>
);

/** X ekseni boyunca uzanan kapsül (uzuv) */
const Limb: React.FC<{length: number; radius: number; color?: string}> = ({length, radius, color = B.orange}) => (
  <Part position={[length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
    <capsuleGeometry args={[radius, length, 10, 24]} />
    <Mat color={color} />
  </Part>
);

export type ArmPose = {shoulder: number; elbow: number};
export const ARM_POSES = {
  flex: {shoulder: 0.06, elbow: 1.55},
  down: {shoulder: -1.35, elbow: 0.15},
  wave: {shoulder: 0.5, elbow: 1.1},
} satisfies Record<string, ArmPose>;

const UPPER = 0.72;
const FORE = 0.62;

const Arm: React.FC<{pose: ArmPose}> = ({pose}) => (
  <group rotation={[0, 0, pose.shoulder]}>
    <Joint r={0.2} color={B.orange} />
    <group position={[0, 0, 0.195]}>
      <Screw />
    </group>
    <Limb length={UPPER} radius={0.135} />
    {/* Pazı */}
    <Part position={[UPPER * 0.48, 0.07, 0]} scale={[1.25, 1, 0.95]}>
      <sphereGeometry args={[0.165, 40, 28]} />
      <Mat color={B.orange} />
    </Part>
    <group position={[UPPER, 0, 0]} rotation={[0, 0, pose.elbow]}>
      <Joint r={0.15} />
      <Limb length={FORE} radius={0.12} />
      {/* Bileklik */}
      <Part position={[FORE - 0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.13, 32]} />
        <Mat color={B.mint} finish="fabric" />
      </Part>
      {/* Eldiven yumruk */}
      <group position={[FORE + 0.19, 0, 0]}>
        <Part scale={[1.05, 0.95, 0.92]}>
          <sphereGeometry args={[0.215, 48, 32]} />
          <Mat color={B.paper} />
        </Part>
        <Part position={[0.01, -0.04, 0.16]} rotation={[0.25, 0, 0.15]}>
          <capsuleGeometry args={[0.05, 0.09, 8, 16]} />
          <Mat color={B.paper} />
        </Part>
      </group>
    </group>
  </group>
);

const Leg: React.FC = () => (
  <group>
    <Joint r={0.15} />
    <Part position={[0, -0.24, 0]}>
      <cylinderGeometry args={[0.13, 0.12, 0.44, 32]} />
      <Mat color={B.orange} />
    </Part>
    {/* Ayakkabı */}
    <group position={[0, -0.5, 0.08]}>
      <RoundedBox args={[0.36, 0.2, 0.56]} radius={0.09} position={[0, 0.03, 0]} castShadow receiveShadow>
        <Mat color={B.mint} />
      </RoundedBox>
      <RoundedBox args={[0.39, 0.07, 0.59]} radius={0.03} position={[0, -0.075, 0]} castShadow receiveShadow>
        <Mat color={B.paper} finish="matte" />
      </RoundedBox>
      {[0.06, 0.15].map((z) => (
        <Part key={z} position={[0, 0.13, z]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.018, 0.14, 4, 8]} />
          <Mat color={B.ink} />
        </Part>
      ))}
    </group>
  </group>
);

/** Kuyruk: USB-C fişli kablo */
const Cable: React.FC = () => {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-0.2, 0.72, -0.3),
        new Vector3(-0.55, 0.45, -0.55),
        new Vector3(-0.95, 0.12, -0.35),
        new Vector3(-1.25, 0.08, 0.1),
        new Vector3(-1.45, 0.1, 0.42),
      ]),
    [],
  );
  const end = curve.getPoint(1);
  const tangent = curve.getTangent(1);
  const yaw = Math.atan2(tangent.x, tangent.z);
  return (
    <group>
      <Part>
        <tubeGeometry args={[curve, 80, 0.05, 16, false]} />
        <Mat color={B.ink} />
      </Part>
      <group position={end} rotation={[0, yaw, 0]}>
        <RoundedBox args={[0.2, 0.14, 0.26]} radius={0.05} position={[0, 0, 0.1]} castShadow>
          <Mat color={B.paper} />
        </RoundedBox>
        <RoundedBox args={[0.13, 0.055, 0.14]} radius={0.025} position={[0, 0, 0.28]} castShadow>
          <Mat color="#d8d6e4" finish="metal" />
        </RoundedBox>
      </group>
    </group>
  );
};

/* ---------- Bütün figür ---------- */

export type FitiToyProps = {
  armL?: ArmPose;
  armR?: ArmPose;
  headTilt?: number;
};

export const FitiToy: React.FC<FitiToyProps> = ({armL = ARM_POSES.flex, armR = ARM_POSES.flex, headTilt = 0.04}) => (
  <group>
    <group position={[0, 0.6, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.27, 0, 0]}>
          <Leg />
        </group>
      ))}
    </group>
    <group position={[0, 0.74, 0]}>
      <Shorts />
    </group>
    <group position={[0, 1.27, 0]}>
      <Torso />
    </group>
    <group position={[0, 1.76, 0]}>
      <Stem />
    </group>
    <group position={[0.66, 1.52, 0]}>
      <Arm pose={armR} />
    </group>
    <group position={[-0.66, 1.52, 0]} scale={[-1, 1, 1]}>
      <Arm pose={armL} />
    </group>
    <group position={[0, 1.82 + HEAD.h / 2, 0]} rotation={[0, 0, headTilt]}>
      <Head />
    </group>
    <Cable />
  </group>
);
