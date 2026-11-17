import React from 'react';
import {B} from './brand';

/* Fiti: Fityazılım maskotu. Kafası F klavye tuşu, ter bandı, atlet, kablo kuyruk.
   Çizim alanı 240 birim genişlik, zemin y=322. Geometri marka_kimligi/ karakter sayfasıyla aynı. */

export type Pt = [number, number];
/** Kol: [dirsek, el], omuzdan dışa doğru x uzaklığı ve y */
export type Arm = [Pt, Pt];
export type ArmPose = 'down' | 'flex' | 'wave' | 'up' | 'point_side' | 'point_up' | 'chin';
export type Face = 'mutlu' | 'nese' | 'saskin' | 'goz_kirpma' | 'dusunceli' | 'endiseli';

export const ARMS: Record<ArmPose, Arm> = {
  down: [[58, 240], [65, 276]],
  flex: [[78, 204], [80, 157]],
  wave: [[70, 192], [86, 150]],
  up: [[72, 180], [90, 138]],
  point_side: [[76, 212], [106, 204]],
  point_up: [[80, 194], [94, 152]],
  chin: [[60, 236], [30, 202]],
};

const HEAD = 'translate(120 72) scale(.9) translate(-120 -72)';
const TORSO = 'M74 206 Q76 190 94 189 H146 Q164 190 166 206 L160 246 Q156 262 154 270 H86 Q84 262 80 246 Z';

const Stroke: React.FC<{d: string; c: string; w: number}> = ({d, c, w}) => (
  <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const p = (q: Pt) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;

const ArmView: React.FC<{side: -1 | 1; arm: Arm; point?: boolean}> = ({side, arm, point}) => {
  const shoulder: Pt = [120 + side * 45, 206];
  const elbow: Pt = [120 + side * arm[0][0], arm[0][1]];
  const hand: Pt = [120 + side * arm[1][0], arm[1][1]];
  const mid = lerp(shoulder, elbow, 0.5);
  const dx = hand[0] - elbow[0];
  const dy = hand[1] - elbow[1];
  const n = Math.hypot(dx, dy) || 1;
  const tip: Pt = [hand[0] + (dx / n) * 17, hand[1] + (dy / n) * 17];
  return (
    <g>
      <circle cx={shoulder[0]} cy={shoulder[1]} r={12} fill={B.orange} />
      <Stroke d={`M${p(shoulder)} L${p(elbow)}`} c={B.orange} w={16} />
      <circle cx={mid[0]} cy={mid[1] - 2} r={9.5} fill={B.orange} />
      <Stroke d={`M${p(elbow)} L${p(hand)}`} c={B.orange} w={14} />
      <path d={`M${p(lerp(elbow, hand, 0.66))} L${p(lerp(elbow, hand, 0.8))}`} stroke={B.mint} strokeWidth={15} />
      {point ? (
        <>
          <Stroke d={`M${p(hand)} L${p(tip)}`} c={B.ink} w={12} />
          <Stroke d={`M${p(hand)} L${p(tip)}`} c={B.paper} w={6} />
        </>
      ) : null}
      <circle cx={hand[0]} cy={hand[1]} r={11} fill={B.paper} stroke={B.ink} strokeWidth={3} />
    </g>
  );
};

const Eyes: React.FC<{dx?: number; dy?: number; big?: boolean; blink?: boolean; onlyLeft?: boolean}> = ({dx = 0, dy = 0, big, blink, onlyLeft}) => {
  const rx = big ? 9.5 : 8.5;
  const ry = big ? 13 : 11.5;
  return (
    <>
      {(onlyLeft ? [98] : [98, 142]).map((cx) =>
        blink ? (
          <Stroke key={cx} d={`M${cx + dx - 9} ${143 + dy} Q${cx + dx} ${148 + dy} ${cx + dx + 9} ${143 + dy}`} c={B.ink} w={4.5} />
        ) : (
          <g key={cx}>
            <ellipse cx={cx + dx} cy={142 + dy} rx={rx} ry={ry} fill={B.ink} />
            <circle cx={cx + dx + 3} cy={137.5 + dy} r={3.2} fill={B.paper} />
          </g>
        ),
      )}
    </>
  );
};

const SMILE = 'M108 162 Q120 173 132 162';

const FaceView: React.FC<{face: Face; blink: boolean; talk: number}> = ({face, blink, talk}) => {
  const talkingMouth =
    talk > 0.08 ? (
      <>
        <path d={`M107 160 Q120 ${168 + talk * 14} 133 160 Z`} fill={B.ink} stroke={B.ink} strokeWidth={3} strokeLinejoin="round" />
        {talk > 0.4 ? <ellipse cx={120} cy={162 + talk * 7} rx={5} ry={2.5 + talk * 1.5} fill="#FF8A8A" /> : null}
      </>
    ) : (
      <Stroke d={SMILE} c={B.ink} w={4.5} />
    );
  switch (face) {
    case 'nese':
      return (
        <>
          <Stroke d="M89 145 Q98 134 107 145 M133 145 Q142 134 151 145" c={B.ink} w={5} />
          <path d="M106 160 Q120 181 134 160 Z" fill={B.ink} stroke={B.ink} strokeWidth={3} strokeLinejoin="round" />
          <ellipse cx={120} cy={171} rx={6} ry={3.5} fill="#FF8A8A" />
        </>
      );
    case 'saskin':
      return (
        <>
          <Eyes big blink={blink} />
          <Stroke d="M88 121 Q98 115 108 121 M132 121 Q142 115 152 121" c={B.ink} w={4} />
          <ellipse cx={120} cy={168} rx={6 + talk * 2} ry={8 + talk * 3} fill={B.ink} />
        </>
      );
    case 'goz_kirpma':
      return (
        <>
          <Eyes onlyLeft blink={blink} />
          <Stroke d="M134 143 Q142 136 150 143" c={B.ink} w={5} />
          {talkingMouth}
        </>
      );
    case 'dusunceli':
      return (
        <>
          <Eyes dx={3} dy={-3} blink={blink} />
          <Stroke d="M133 121 Q142 115 151 120" c={B.ink} w={4} />
          <Stroke d="M112 166 Q121 163 130 167" c={B.ink} w={4} />
        </>
      );
    case 'endiseli':
      return (
        <>
          <Eyes blink={blink} />
          <Stroke d="M88 127 L106 121 M152 127 L134 121" c={B.ink} w={4} />
          <Stroke d="M108 168 Q114 162 120 168 Q126 174 132 168" c={B.ink} w={4} />
          <path d="M176 104 Q167 120 176 125 Q185 120 176 104 Z" fill={B.sky} stroke={B.ink} strokeWidth={2.5} strokeLinejoin="round" />
        </>
      );
    default:
      return (
        <>
          <Eyes blink={blink} />
          {talkingMouth}
        </>
      );
  }
};

const Keycap: React.FC = () => (
  <>
    <path d="M44 198 H196 L193 207 Q192 210 188 210 H52 Q48 210 47 207 Z" fill={B.orangeDark} />
    <polygon points="62,90 178,90 192,198 48,198" fill={B.orange} stroke={B.orange} strokeWidth={10} strokeLinejoin="round" />
    <polygon points="70,76 170,76 178,90 62,90" fill={B.orangeLight} stroke={B.orangeLight} strokeWidth={8} strokeLinejoin="round" />
    <polygon points="57,98 183,98 185,116 55,116" fill={B.mint} stroke={B.mint} strokeWidth={4} strokeLinejoin="round" />
    <rect x={110} y={78} width={20} height={5} rx={2.5} fill={B.bump} />
    <Stroke d="M114 101 V113 M114 101 H124 M114 107 H121" c={B.ink} w={3} />
    <ellipse cx={80} cy={162} rx={9} ry={5} fill={B.cheek} />
    <ellipse cx={160} cy={162} rx={9} ry={5} fill={B.cheek} />
  </>
);

const Plug: React.FC = () => (
  <>
    <Stroke d="M100 321 C82 322 68 322 56 320" c={B.ink} w={6} />
    <rect x={36} y={313} width={20} height={14} rx={3} fill={B.paper} stroke={B.ink} strokeWidth={3} />
    <rect x={29} y={317} width={7} height={6} rx={2} fill={B.mintDark} />
  </>
);

const Body: React.FC = () => (
  <>
    {[94, 128].map((x, i) => (
      <g key={x}>
        <path d={`M${x + 1} 286 Q${x - 1} 296 ${x + 2} 306 H${x + 17} Q${x + 20} 296 ${x + 17} 286 Z`} fill={B.orange} />
        <rect x={[87, 123][i]} y={304} width={30} height={18} rx={9} fill={B.mint} />
        <rect x={[87, 123][i]} y={316} width={30} height={6} rx={3} fill={B.mintDark} />
      </g>
    ))}
    <path d="M86 262 H154 L158 292 H124 L120 280 L116 292 H82 Z" fill={B.ink2} stroke={B.ink2} strokeWidth={4} strokeLinejoin="round" />
    <Stroke d="M86 268 L84 290 M154 268 L156 290" c={B.mint} w={3} />
    <path d={TORSO} fill={B.ink} />
    <Stroke d="M100 218 Q110 223 120 218 Q130 223 140 218" c={B.ink2} w={2.5} />
    <Stroke d="M88 204 L84 242 M152 204 L156 242" c={B.mint} w={3} />
  </>
);

export type FitiProps = {
  armL: Arm;
  armR: Arm;
  face: Face;
  tilt?: number;
  blink?: boolean;
  /** Konuşma ağzı açıklığı 0..1 */
  talk?: number;
  pointL?: boolean;
  pointR?: boolean;
  /** Gövde zıplaması (birim) */
  bob?: number;
  /** Ezilme: 1 normal, <1 basık, >1 uzun */
  squash?: number;
};

/** Kolu yukarıda olan (el omuzdan yukarıda) kafanın önünde çizilir */
const raised = (arm: Arm) => arm[1][1] < 232;

export const Fiti: React.FC<FitiProps> = ({armL, armR, face, tilt = 0, blink = false, talk = 0, pointL, pointR, bob = 0, squash = 1}) => {
  const left = <ArmView side={-1} arm={armL} point={pointL} />;
  const right = <ArmView side={1} arm={armR} point={pointR} />;
  return (
    <g transform={`translate(120 322) scale(${2 - squash} ${squash}) translate(-120 -322)`}>
      <Plug />
      <g transform={`translate(0 ${-bob})`}>
        <Body />
        {raised(armL) ? null : left}
        {raised(armR) ? null : right}
        <g transform={`rotate(${tilt} 120 200)`}>
          <g transform={HEAD}>
            <Keycap />
            <FaceView face={face} blink={blink} talk={talk} />
          </g>
        </g>
        {raised(armL) ? left : null}
        {raised(armR) ? right : null}
      </g>
    </g>
  );
};

/** İki kol pozu arasında yumuşak geçiş */
export const mixArm = (a: Arm, b: Arm, t: number): Arm => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
