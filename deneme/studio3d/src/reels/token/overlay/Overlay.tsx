import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {B, body, display, easeOut, life, pop, prog} from '../../../kit2d/brand';
import {Chip} from '../../../kit2d/ui';
import {ANKET, AVT, DEG, DEGER, GEL, HOOK, OUTRO_AT, PROB, SCENE_BG, SCENES, SERT, SORU, SEKTOR, TOKEN, sceneAt, type SceneKey} from '../timeline';

/* Yazı katmanı: her parça Klip'te ayrı şeffaf video olabilir (OVERLAY_PARTS). */

type Base = {id: string; name: string; from: number; to: number};
type Part = Base &
  (
    | {kind: 'title'}
    | {kind: 'progress'}
    | {kind: 'chapter'; text: string; scene: SceneKey}
    | {kind: 'headline'; text: string; accent?: string; scene: SceneKey; size: number}
    | {kind: 'fact'; text: string; scene: SceneKey; side: 'left' | 'right'; row: number; dot: string}
  );

const dark = (s: SceneKey) => SCENE_BG[s] === B.ink;
const ink = (s: SceneKey) => (dark(s) ? B.paper : B.ink);
const accentColor = (s: SceneKey) => (dark(s) ? B.lemon : B.orange);

const CHAPTERS: {scene: SceneKey; label: string}[] = [
  {scene: 'degisti', label: 'YAPAY ZEKÂDAN SONRA'},
  {scene: 'deger', label: 'YENİ DEĞER'},
  {scene: 'token', label: 'ASIL DEĞER'},
  {scene: 'sektor', label: 'SEKTÖR SEÇ'},
  {scene: 'avantaj', label: 'AVANTAJ'},
  {scene: 'problem', label: 'ASIL MESELE'},
  {scene: 'sertifika', label: 'SERTİFİKA YERİNE'},
  {scene: 'soru', label: 'KENDİNE SOR'},
  {scene: 'gelecek', label: 'GELECEK'},
  {scene: 'anket', label: 'SENCE?'},
];
const sceneEnd = (s: SceneKey) => Math.min(SCENES[s][1] - 0.2, OUTRO_AT - 0.1);

const headline = (id: string, scene: SceneKey, from: number, to: number, text: string, size: number, accent?: string): Part => ({
  id,
  name: `Başlık: ${text}`,
  from,
  to,
  kind: 'headline',
  text,
  accent,
  scene,
  size,
});

const fact = (id: string, scene: SceneKey, from: number, text: string, side: 'left' | 'right', row: number, dot: string): Part => ({
  id,
  name: `Çip: ${text}`,
  from,
  to: sceneEnd(scene),
  kind: 'fact',
  text,
  scene,
  side,
  row,
  dot,
});

const PARTS: Part[] = [
  {id: 'baslik', name: 'Başlık: Sadece iyi bir yazılımcı olmak yeterli olmayabilir', from: 0.05, to: SCENES.hook[1] - 0.2, kind: 'title'},
  {id: 'ilerleme', name: 'İlerleme çubuğu', from: 4.5, to: OUTRO_AT - 0.1, kind: 'progress'},
  ...CHAPTERS.map((c, i): Part => ({
    id: `bolum-${i + 1}`,
    name: `Bölüm: ${c.label}`,
    from: SCENES[c.scene][0] + 0.35,
    to: sceneEnd(c.scene),
    kind: 'chapter',
    text: c.label,
    scene: c.scene,
  })),
  headline('b-degisti', 'degisti', DEG.yapay, DEG.ben - 0.05, 'Kod yazma şeklimiz tamamen değişti', 80, 'tamamen değişti'),
  headline('b-for', 'degisti', DEG.ben, sceneEnd('degisti'), 'En son ne zaman sıfırdan bir for döngüsü yazdım?', 68, 'for döngüsü'),
  headline('b-deger', 'deger', DEGER.artik, sceneEnd('deger'), 'Kod yazmak değil, ne yazacağını bilmek', 76, 'ne yazacağını bilmek'),
  headline('b-token', 'token', TOKEN.bence, sceneEnd('token'), 'Yapay zekânın ürettiği tokenleri paraya çevirebilmek', 72, 'paraya çevirebilmek'),
  headline('b-sektor', 'sektor', SEKTOR.yazilim, sceneEnd('sektor'), 'Yazılım dışında bir sektör düşün', 80, 'bir sektör'),
  headline('b-avantaj1', 'avantaj', AVT.eger, AVT.iste - 0.05, 'Sektörü bil, yapay zekâyla bir problemi çöz', 72, 'bir problemi çöz'),
  headline('b-avantaj2', 'avantaj', AVT.iste, sceneEnd('avantaj'), 'İşte o zaman ciddi bir avantajın var', 80, 'ciddi bir avantajın'),
  headline('b-mesele', 'problem', PROB.cunku, PROB.insanlarin - 0.05, 'Mesele sadece yazılım geliştirmek değil', 76, 'değil'),
  headline('b-problem', 'problem', PROB.insanlarin, sceneEnd('problem'), 'İnsanların para ödemeye hazır olduğu bir problemi çözmek', 66, 'para ödemeye hazır'),
  headline('b-sertifika', 'sertifika', SERT.bu, SERT.kendinize - 0.05, '90 günde Python öğrenip sertifika almak yerine…', 70, 'yerine…'),
  headline('b-sor', 'sertifika', SERT.kendinize, sceneEnd('sertifika'), 'Kendinize şu soruyu sormalısınız:', 76, 'şu soruyu'),
  headline('b-soru', 'soru', SORU.ben, sceneEnd('soru'), 'Yazılım dışında hangi sektörde, hangi problemi herkesten daha iyi anlayabilirim?', 66, 'herkesten daha iyi'),
  headline('b-gelecek1', 'gelecek', GEL.cunku, GEL.yapay - 0.05, 'Gelecekte sadece iyi kod yazanlar değil…', 76, 'değil…'),
  headline('b-gelecek2', 'gelecek', GEL.yapay, sceneEnd('gelecek'), 'yapay zekâyla gerçek problemleri çözenler kazanacak', 72, 'problemleri çözenler'),
  headline('b-anket', 'anket', ANKET.sizce, sceneEnd('anket'), 'Sizce yazılımcılığın geleceği ne?', 76, 'geleceği'),
  fact('c-avantaj', 'avantaj', AVT.avantajin, 'Ciddi avantaj', 'right', 2, B.lemon),
  fact('c-yorum', 'anket', ANKET.yorumlara, 'Yorumlara yaz', 'right', 2, B.orange),
];

export type OverlayPart = Base;
export const OVERLAY_PARTS: OverlayPart[] = PARTS.map(({id, name, from, to}) => ({id, name, from, to}));

const Title: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const out = 1 - prog(t, p.to - 0.25, 0.25);
  const line = (at: number) => {
    const q = pop(t, at, 0.45);
    return {opacity: Math.min(1, q * 1.5) * out, transform: `translateY(${(1 - q) * 60}px)`, display: 'block'};
  };
  const marker = easeOut(prog(t, HOOK.yeterli, 0.35));
  return (
    <div style={{position: 'absolute', left: 80, top: 250, fontFamily: display, fontWeight: 800, fontSize: 108, lineHeight: 1.02, letterSpacing: -3.3, color: B.ink}}>
      <span style={line(0.1)}>Sadece iyi bir</span>
      <span style={line(0.35)}>yazılımcı olmak</span>
      <span style={{...line(HOOK.yeterli - 0.1), position: 'relative', isolation: 'isolate', color: B.orange, fontSize: 92, marginTop: 14}}>
        <span
          style={{
            position: 'absolute',
            left: -16,
            right: -20,
            top: 12,
            bottom: 2,
            background: B.lemon,
            borderRadius: 14,
            transform: `scaleX(${marker}) rotate(-1.5deg)`,
            transformOrigin: 'left',
            zIndex: -1,
          }}
        />
        yeterli olmayabilir
      </span>
    </div>
  );
};

const Progress: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const vis = life(t, p.from, p.to);
  const color = ink(sceneAt(t));
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 196, display: 'flex', gap: 10, opacity: vis}}>
      {CHAPTERS.map((c) => {
        const [a, b] = SCENES[c.scene];
        const fill = Math.min(1, Math.max(0, (t - a) / (b - a)));
        return (
          <div key={c.scene} style={{flex: 1, height: 12, borderRadius: 6, background: `${color}26`, overflow: 'hidden'}}>
            <div style={{width: `${fill * 100}%`, height: '100%', background: fill >= 1 ? color : B.orange, borderRadius: 6}} />
          </div>
        );
      })}
    </div>
  );
};

/** Metni vurgulu parçasıyla birlikte yazar */
const Accented: React.FC<{text: string; accent?: string; color: string}> = ({text, accent, color}) => {
  const i = accent ? text.indexOf(accent) : -1;
  if (!accent || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span style={{color}}>{accent}</span>
      {text.slice(i + accent.length)}
    </>
  );
};

const Headline: React.FC<{t: number; p: Extract<Part, {kind: 'headline'}>}> = ({t, p}) => {
  const q = pop(t, p.from, 0.45);
  const out = 1 - prog(t, p.to - 0.18, 0.18);
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        top: 300,
        width: 920,
        fontFamily: display,
        fontWeight: 800,
        fontSize: p.size,
        lineHeight: 1.04,
        letterSpacing: -p.size * 0.03,
        color: ink(p.scene),
        textWrap: 'balance',
        opacity: Math.min(1, q * 1.5) * out,
        transform: `translateY(${(1 - q) * 50 - (1 - out) * 30}px)`,
      }}
    >
      <Accented text={p.text} accent={p.accent} color={accentColor(p.scene)} />
    </div>
  );
};

const Fact: React.FC<{t: number; p: Extract<Part, {kind: 'fact'}>}> = ({t, p}) => {
  const q = pop(t, p.from, 0.42);
  const out = 1 - prog(t, p.to - 0.2, 0.2);
  const right = p.side === 'right';
  return (
    <div
      style={{
        position: 'absolute',
        top: 1080 + p.row * 112,
        left: right ? 560 : 80,
        maxWidth: right ? 420 : 440,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: B.white,
        border: `5px solid ${B.ink}`,
        boxShadow: `6px 7px 0 ${B.ink}`,
        borderRadius: 26,
        padding: '16px 24px',
        fontFamily: body,
        fontWeight: 600,
        fontSize: 36,
        lineHeight: 1.12,
        color: B.ink,
        opacity: Math.min(1, q * 1.6) * out,
        transform: `translateX(${(1 - q) * (right ? 80 : -80)}px) scale(${0.8 + 0.2 * q})`,
        transformOrigin: 'left center',
      }}
    >
      <span style={{flex: '0 0 auto', width: 20, height: 20, borderRadius: 10, background: p.dot, border: `4px solid ${B.ink}`}} />
      <span>{p.text}</span>
    </div>
  );
};

const PartView: React.FC<{p: Part; t: number}> = ({p, t}) => {
  switch (p.kind) {
    case 'title':
      return <Title t={t} p={p} />;
    case 'progress':
      return <Progress t={t} p={p} />;
    case 'chapter': {
      const q = pop(t, p.from, 0.4);
      const out = 1 - prog(t, p.to - 0.2, 0.2);
      return (
        <div style={{position: 'absolute', left: 80, top: 226, opacity: Math.min(1, q * 1.5) * out, transform: `translateX(${(1 - q) * -60}px)`}}>
          <Chip text={p.text} bg={dark(p.scene) ? B.orange : B.ink} fg={dark(p.scene) ? B.ink : B.mint} size={26} />
        </div>
      );
    }
    case 'headline':
      return <Headline t={t} p={p} />;
    case 'fact':
      return <Fact t={t} p={p} />;
  }
};

/** part verilirse yalnızca o parça çizilir (Klip projesi için parça parça render) */
export const Overlay: React.FC<{part?: string}> = ({part}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {PARTS.filter((p) => (!part || part === p.id) && t >= p.from - 0.05 && t <= p.to + 0.05).map((p) => (
        <PartView key={p.id} p={p} t={t} />
      ))}
    </AbsoluteFill>
  );
};
