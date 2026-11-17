import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {B, body, display, life, pop, prog} from '../../../kit2d/brand';
import {Chip} from '../../../kit2d/ui';
import {CTA, DETAY, HOOK, KINDA, LISTE, ORNEK, OUTRO_AT, SCENE_BG, SCENES, SECIM, SITE, SON, TERAZI, sceneAt, type SceneKey} from '../timeline';

/* Yazı katmanı: her parça Klip'te ayrı şeffaf video olabilir (OVERLAY_PARTS). */

type Base = {id: string; name: string; from: number; to: number};
type Part = Base &
  (
    | {kind: 'progress'}
    | {kind: 'chapter'; text: string; scene: SceneKey}
    | {kind: 'headline'; text: string; accent?: string; scene: SceneKey; size: number}
    | {kind: 'fact'; text: string; scene: SceneKey; side: 'left' | 'right'; row: number; dot: string}
  );

const dark = (s: SceneKey) => SCENE_BG[s] === B.ink;
const ink = (s: SceneKey) => (dark(s) ? B.paper : B.ink);
const accentColor = (s: SceneKey) => (dark(s) ? B.lemon : B.orange);

const CHAPTERS: {scene: SceneKey; label: string}[] = [
  {scene: 'site', label: 'GİZLİ SİTE'},
  {scene: 'liste', label: '1.000+ UYGULAMA'},
  {scene: 'ornek', label: 'MESELA'},
  {scene: 'secim', label: 'SEÇ'},
  {scene: 'terazi', label: 'ASIL SORU'},
  {scene: 'kinda', label: 'CEVAP'},
  {scene: 'detay', label: 'DETAYLAR'},
  {scene: 'cta', label: 'KAYDET & GÖNDER'},
  {scene: 'son', label: 'ADRES'},
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
  {id: 'ilerleme', name: 'İlerleme çubuğu', from: SCENES.site[0] + 0.3, to: OUTRO_AT - 0.1, kind: 'progress'},
  ...CHAPTERS.map((c, i): Part => ({
    id: `bolum-${i + 1}`,
    name: `Bölüm: ${c.label}`,
    from: SCENES[c.scene][0] + 0.35,
    to: sceneEnd(c.scene),
    kind: 'chapter',
    text: c.label,
    scene: c.scene,
  })),
  headline('b-hook1', 'hook', HOOK.yapay, HOOK.hangi - 0.05, 'Yapay zekâyla her şeyi kodlayabiliyorsan…', 88, 'her şeyi'),
  headline('b-hook2', 'hook', HOOK.hangi, sceneEnd('hook'), 'Hangi uygulamalara para ödemeye devam edeceğiz?', 80, 'para ödemeye'),
  headline('b-gizli', 'site', SITE.bu, SITE.can - 0.05, 'Bu sorunun cevabı bir web sitesinde gizli', 80, 'gizli'),
  headline('b-site', 'site', SITE.can, sceneEnd('site'), 'Can I Vibecode It?', 104, 'Vibecode'),
  headline('b-liste', 'liste', LISTE.siteye, sceneEnd('liste'), "Karşına 1.000'den fazla popüler uygulama çıkıyor", 76, "1.000'den fazla"),
  headline('b-ornek', 'ornek', ORNEK.mesela, sceneEnd('ornek'), 'Mesela CapCut, Canva veya kullandığın başka bir yazılım', 70, 'kullandığın'),
  headline('b-secim', 'secim', SECIM.uygulamayi, sceneEnd('secim'), 'Uygulamayı seç, sana şu sorunun cevabını veriyor:', 72, 'şu sorunun'),
  headline('b-kendim', 'terazi', TERAZI.bunu, TERAZI.yoksa - 0.05, 'Bunu yapay zekâyla kendim geliştirebilir miyim?', 76, 'kendim'),
  headline('b-ode', 'terazi', TERAZI.yoksa, sceneEnd('terazi'), 'Yoksa bu uygulamaya para ödemeye devam mı etmeliyim?', 72, 'para ödemeye'),
  headline('b-kinda', 'kinda', KINDA.ustelik, sceneEnd('kinda'), 'Üstelik sadece evet veya hayır demiyor', 80, 'evet veya hayır'),
  headline('b-detay', 'detay', DETAY.uygulamanin, sceneEnd('detay'), 'Neyi kolayca yapabileceğini, nerede zorlanacağını açıklıyor', 68, 'nerede zorlanacağını'),
  headline('b-kaydet', 'cta', CTA.daha, CTA.aboneliklere - 0.05, 'Daha sonra incelemek için kaydet', 80, 'kaydet'),
  headline('b-gonder', 'cta', CTA.aboneliklere, sceneEnd('cta'), 'Aboneliklere boşuna para harcamasın, bir arkadaşına gönder', 70, 'arkadaşına gönder'),
  headline('b-son', 'son', SON.can, sceneEnd('son'), 'Can I Vibecode It?', 104, 'Vibecode'),
  fact('c-kinda', 'kinda', KINDA.demiyor + 0.35, 'KINDA = kısmen, hafta sonu projesi', 'left', 3, B.lemon),
  fact('c-kolay', 'detay', DETAY.kolayca, 'Kolay kısımlar', 'left', 2, '#3DDC84'),
  fact('c-zor', 'detay', DETAY.zorlanacagini, 'Zorlanacağın yerler', 'left', 3, B.orange),
  fact('c-neden', 'detay', DETAY.ihtiyac, 'Neden hâlâ ödüyorsun', 'left', 4, B.lemon),
];

export type OverlayPart = Base;
export const OVERLAY_PARTS: OverlayPart[] = PARTS.map(({id, name, from, to}) => ({id, name, from, to}));

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
