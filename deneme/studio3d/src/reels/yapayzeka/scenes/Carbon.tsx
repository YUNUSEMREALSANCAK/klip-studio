import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, easeOut, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Stage} from '../../../kit2d/ui';
import {CARBON, useSceneTime} from '../timeline';
import {CodeBadge, Shield} from './shared';

/* 01 · Google Gemini 4 Carbon: dönen karbon kafesi (grafen), kodlama ve kalkan rozetleri, kilit açılır */

const R = 72;
const CENTER: [number, number] = [560, 700];

const lattice = (() => {
  const centers: [number, number][] = [[0, 0], ...Array.from({length: 6}, (_, i): [number, number] => {
    const a = (Math.PI / 3) * i;
    return [Math.sqrt(3) * R * Math.cos(a), Math.sqrt(3) * R * Math.sin(a)];
  })];
  const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  const nodes = new Map<string, [number, number]>();
  const edges = new Map<string, [[number, number], [number, number]]>();
  for (const [cx, cy] of centers) {
    const v = Array.from({length: 6}, (_, i): [number, number] => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    v.forEach((p, i) => {
      nodes.set(key(...p), p);
      const q = v[(i + 1) % 6];
      const ek = [key(...p), key(...q)].sort().join('|');
      edges.set(ek, [p, q]);
    });
  }
  return {nodes: [...nodes.values()], edges: [...edges.values()]};
})();

export const Carbon: React.FC = () => {
  const t = useSceneTime('carbon');
  const rot = t * 6;
  const lockIn = pop(t, CARBON.beta + 0.2);
  const open = easeOut(prog(t, CARBON.aciliyor, 0.4));
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <g transform={`translate(${CENTER[0]} ${CENTER[1]}) rotate(${rot})`}>
          {lattice.edges.map(([a, b], i) => {
            const d = Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            const p = easeOut(prog(t, CARBON.gemini + d / 400, 0.4));
            return (
              <line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={a[0] + (b[0] - a[0]) * p}
                y2={a[1] + (b[1] - a[1]) * p}
                stroke={B.ink}
                strokeWidth={9}
                strokeLinecap="round"
              />
            );
          })}
          {lattice.nodes.map(([x, y], i) => {
            const d = Math.hypot(x, y);
            const s = pop(t, CARBON.gemini - 0.1 + d / 420, 0.35);
            return <circle key={i} cx={x} cy={y} r={17 * s} fill={i % 3 === 0 ? B.mint : B.orange} stroke={B.ink} strokeWidth={5} />;
          })}
        </g>
        <g transform={`translate(${CENTER[0]} ${CENTER[1]}) scale(${lockIn})`}>
          <path
            d={`M-30 -10 V-38 Q-30 -66 0 -66 Q30 -66 30 -38 V${-10 - open * 26}`}
            transform={`translate(${open * 0} ${-open * 18})`}
            stroke={B.ink}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <rect x={-48} y={-14} width={96} height={80} rx={16} fill={B.lemon} stroke={B.ink} strokeWidth={7} />
          <circle cy={22} r={10} fill={B.ink} />
        </g>
        <CodeBadge x={225} y={560} s={pop(t, CARBON.kodlama)} />
        <Shield x={880} y={560} s={pop(t, CARBON.siber)} check={easeOut(prog(t, CARBON.beta, 0.5))} />
      </Stage>
    </AbsoluteFill>
  );
};
