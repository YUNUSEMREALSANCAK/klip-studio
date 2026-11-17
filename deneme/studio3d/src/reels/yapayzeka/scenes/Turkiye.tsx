import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, body, easeInOut, easeOut, mono, pop, prog} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {TR, useSceneTime} from '../timeline';
import {Scale} from '../../../kit2d/shapes';

/* 05 · Türkiye: Rekabet Kurumu, Google'ın yapay zekâ özetlerine soruşturma + geçici tedbir.
   Arama sonucu maketi: özet kutusu, büyüteç, TEDBİR damgası, haber sitesinin "özette kullan" anahtarı kapanır, sırası korunur. */

const Row: React.FC<{y: number; title: string; url: string; highlight?: number; check?: number}> = ({y, title, url, highlight = 0, check = 0}) => (
  <g transform={`translate(0 ${y})`}>
    {highlight > 0 ? <rect x={132} y={-8} width={816} height={74} rx={16} fill={B.lemon} opacity={highlight} /> : null}
    <circle cx={176} cy={29} r={18} fill={B.paper} stroke={B.ink} strokeWidth={4} />
    <text x={212} y={24} fontFamily={body} fontWeight={600} fontSize={28} fill={B.orangeDark}>
      {title}
    </text>
    <text x={212} y={54} fontFamily={mono} fontSize={18} fill={B.muted}>
      {url}
    </text>
    {check > 0 ? (
      <g transform={`translate(150 29) scale(${check})`}>
        <circle r={22} fill={B.mint} stroke={B.ink} strokeWidth={4} />
        <path d="M-9 0 L-2 7 L10 -7" stroke={B.ink} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ) : null}
  </g>
);

export const Turkiye: React.FC = () => {
  const t = useSceneTime('turkiye');
  const card = pop(t, 51.1, 0.5);
  const scale = pop(t, TR.rekabet, 0.45);
  const tip = Math.sin(Math.max(0, t - TR.rekabet) * 3) * 8 * Math.exp(-Math.max(0, t - TR.rekabet) * 0.8);
  const lens = easeInOut(prog(t, TR.sorusturma, 1.3));
  const lensOn = t > TR.sorusturma && t < TR.sorusturma + 1.6;
  const stamp = prog(t, TR.tedbir, 0.22);
  const stampS = 2.2 - 1.2 * easeOut(stamp);
  const hi = easeOut(prog(t, TR.haber, 0.4));
  const off = easeInOut(prog(t, TR.reddedebilecek, 0.3));
  const swap = easeInOut(prog(t, TR.arama, 0.7));
  const check = pop(t, TR.geriPlana);
  return (
    <AbsoluteFill>
      <DotGrid bg={B.paper} />
      <Stage>
        <g transform={`translate(540 735) scale(${card}) translate(-540 -735)`}>
          <rect x={108} y={472} width={880} height={548} rx={34} fill={B.ink} />
          <rect x={100} y={460} width={880} height={548} rx={34} fill={B.white} stroke={B.ink} strokeWidth={6} />
          <rect x={140} y={496} width={800} height={76} rx={38} fill={B.paper} stroke={B.ink} strokeWidth={4} />
          <circle cx={188} cy={532} r={16} fill="none" stroke={B.ink} strokeWidth={5} />
          <path d="M200 545 L212 557" stroke={B.ink} strokeWidth={6} strokeLinecap="round" />
          <text x={232} y={546} fontFamily={mono} fontSize={30} fill={B.ink}>
            yapay zekâ haberleri
          </text>
          <g>
            <rect x={140} y={600} width={800} height={170} rx={24} fill="#E3FBF2" stroke={B.mintDark} strokeWidth={4} />
            <Sparkle x={180} y={640} r={16} color={B.mint} />
            <text x={208} y={652} fontFamily={body} fontWeight={800} fontSize={30} fill={B.ink}>
              Yapay zekâ özeti
            </text>
            {[0, 1, 2].map((r) => (
              <rect key={r} x={172} y={680 + r * 28} width={[700, 640, 420][r]} height={14} rx={7} fill={B.mintDark} opacity={0.45} />
            ))}
            {stamp > 0 ? (
              <g transform={`translate(700 690) rotate(-9) scale(${stampS})`} opacity={Math.min(1, stamp * 2)}>
                <rect x={-150} y={-46} width={300} height={92} rx={14} fill={B.white} stroke={B.orange} strokeWidth={9} />
                <text y={22} textAnchor="middle" fontFamily={mono} fontWeight={600} fontSize={56} letterSpacing={6} fill={B.orange}>
                  TEDBİR
                </text>
              </g>
            ) : null}
          </g>
          <Row y={792} title="Haber sitesi" url="ornek-haber.tr" highlight={hi} check={check} />
          <g transform={`translate(0 ${swap * 72})`}>
            <Row y={866} title="Ansiklopedi" url="ornek-bilgi.org" />
          </g>
          <g transform={`translate(0 ${-swap * 72})`}>
            <Row y={938} title="Forum" url="ornek-forum.com" />
          </g>
          {hi > 0 ? (
            <g transform={`translate(830 820) scale(${pop(t, TR.haber + 0.15)})`}>
              <text x={-130} y={-30} fontFamily={mono} fontSize={20} fill={B.ink}>
                özette kullan
              </text>
              <rect x={-40} y={-20} width={96} height={48} rx={24} fill={off > 0.5 ? B.paper : B.mint} stroke={B.ink} strokeWidth={4} />
              <circle cx={32 - off * 48} cy={4} r={17} fill={B.ink} />
            </g>
          ) : null}
        </g>
        {lensOn ? (
          <g transform={`translate(${200 + lens * 600} ${690 + Math.sin(lens * Math.PI * 2) * 20})`}>
            <circle r={62} fill={B.white} fillOpacity={0.35} stroke={B.ink} strokeWidth={10} />
            <path d="M44 44 L100 100" stroke={B.ink} strokeWidth={18} strokeLinecap="round" />
          </g>
        ) : null}
        <Scale x={910} y={478} s={scale * 0.82} tip={tip} />
      </Stage>
    </AbsoluteFill>
  );
};
