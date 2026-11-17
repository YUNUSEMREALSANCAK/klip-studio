import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {B, body, display, easeOut, life, mono, pop, prog} from '../../../kit2d/brand';
import {Chip} from '../../../kit2d/ui';
import {ANT, CARBON, END, GENIE, INTRO, SCENE_BG, SCENES, TERRA, TR, sceneAt, type SceneKey} from '../timeline';

/* Yazı katmanı: her parça Klip'te ayrı şeffaf video olur (OVERLAY_PARTS). */

type Base = {id: string; name: string; from: number; to: number};
type Part = Base &
  (
    | {kind: 'title'}
    | {kind: 'date'; text: string}
    | {kind: 'teaser'; text: string}
    | {kind: 'progress'}
    | {kind: 'chapter'; text: string; scene: SceneKey}
    | {kind: 'headline'; text: string; scene: SceneKey; size: number}
    | {kind: 'fact'; text: string; scene: SceneKey; side: 'left' | 'right'; row: number; dot: string}
    | {kind: 'counter'}
    | {kind: 'question'}
  );

const ink = (s: SceneKey) => (SCENE_BG[s] === B.ink ? B.paper : B.ink);

const CHAPTERS: {scene: SceneKey; n: string; label: string}[] = [
  {scene: 'carbon', n: '01', label: 'GOOGLE'},
  {scene: 'terra', n: '02', label: 'OPENAI'},
  {scene: 'anthropic', n: '03', label: 'ANTHROPIC'},
  {scene: 'genie', n: '04', label: 'DEEPMIND'},
  {scene: 'turkiye', n: '05', label: 'TÜRKİYE'},
];
const chapterEnd = (s: SceneKey) => SCENES[s][1] - 0.2;

const PARTS: Part[] = [
  {id: 'baslik', name: 'Başlık: Yapay zekâ dünyasında bu hafta', from: 0.25, to: 4.6, kind: 'title'},
  {id: 'tarih', name: 'Tarih: 26 Ekim – 2 Kasım', from: 1.4, to: 4.6, kind: 'date', text: '26 EKİM – 2 KASIM'},
  {id: 'son-haber', name: 'Son haber Türkiye’den', from: INTRO.son, to: 4.6, kind: 'teaser', text: 'SON HABER TÜRKİYE’DEN'},
  {id: 'ilerleme', name: 'İlerleme çubuğu (5 haber)', from: 4.5, to: SCENES.end[0] + 0.3, kind: 'progress'},
  ...CHAPTERS.map((c): Part => ({id: `bolum-${c.n}`, name: `Bölüm ${c.n} ${c.label}`, from: SCENES[c.scene][0] + 0.35, to: chapterEnd(c.scene), kind: 'chapter', text: `${c.n} · ${c.label}`, scene: c.scene})),
  // Başlıklar
  {id: 'b1a', name: 'Başlık: Google’ın yeni modeli', from: CARBON.google, to: CARBON.gemini, kind: 'headline', text: 'Google’ın yeni modeli', scene: 'carbon', size: 76},
  {id: 'b1', name: 'Başlık: Gemini 4 Carbon', from: CARBON.gemini, to: chapterEnd('carbon'), kind: 'headline', text: 'Gemini 4 Carbon', scene: 'carbon', size: 96},
  {id: 'b2a', name: 'Başlık: ChatGPT bilgisayarını kullanıyor', from: TERRA.chatgpt, to: TERRA.openai, kind: 'headline', text: 'ChatGPT bilgisayarını senin yerine kullanıyor', scene: 'terra', size: 64},
  {id: 'b2', name: 'Başlık: GPT-6.1 Terra', from: TERRA.openai, to: chapterEnd('terra'), kind: 'headline', text: 'GPT-6.1 Terra', scene: 'terra', size: 96},
  {id: 'b3a', name: 'Başlık: Claude’un şirketi halka arz yolunda', from: ANT.claude, to: ANT.anthropic, kind: 'headline', text: 'Claude’un şirketi halka arz yolunda', scene: 'anthropic', size: 64},
  {id: 'b3', name: 'Başlık: Anthropic', from: ANT.anthropic, to: chapterEnd('anthropic'), kind: 'headline', text: 'Anthropic', scene: 'anthropic', size: 96},
  {id: 'b4a', name: 'Başlık: Cümleden yaşayan dünya', from: GENIE.start + 0.1, to: GENIE.deepmind, kind: 'headline', text: 'Yazdığın cümle yaşayan bir dünyaya dönüşüyor', scene: 'genie', size: 64},
  {id: 'b4', name: 'Başlık: Genie 4', from: GENIE.deepmind, to: chapterEnd('genie'), kind: 'headline', text: 'Genie 4', scene: 'genie', size: 96},
  {id: 'b5a', name: 'Başlık: Türkiye’den iki gelişme', from: TR.turkiye - 0.1, to: TR.rekabet, kind: 'headline', text: 'Türkiye’den iki önemli gelişme', scene: 'turkiye', size: 64},
  {id: 'b5', name: 'Başlık: Rekabet Kurumu', from: TR.rekabet, to: chapterEnd('turkiye'), kind: 'headline', text: 'Rekabet Kurumu', scene: 'turkiye', size: 88},
  // Bilgi çipleri
  {id: 'c1-1', name: 'Çip: Kodlama', from: CARBON.kodlama, to: chapterEnd('carbon'), kind: 'fact', text: 'Kodlama', scene: 'carbon', side: 'right', row: 0, dot: B.mint},
  {id: 'c1-2', name: 'Çip: Siber güvenlik', from: CARBON.siber, to: chapterEnd('carbon'), kind: 'fact', text: 'Siber güvenlik', scene: 'carbon', side: 'right', row: 1, dot: B.orange},
  {id: 'c1-3', name: 'Çip: İlk erişim siber güvenlik ekipleri', from: CARBON.beta, to: chapterEnd('carbon'), kind: 'fact', text: 'İlk erişim: siber güvenlik ekipleri', scene: 'carbon', side: 'right', row: 2, dot: B.lemon},
  {id: 'c2-1', name: 'Çip: Ekranı görüyor', from: TERRA.ekrani, to: chapterEnd('terra'), kind: 'fact', text: 'Ekranı görüyor', scene: 'terra', side: 'left', row: 0, dot: B.mint},
  {id: 'c2-2', name: 'Çip: Uygulamalar arası geçiş', from: TERRA.uygulamalar, to: chapterEnd('terra'), kind: 'fact', text: 'Uygulamalar arası geçiş', scene: 'terra', side: 'left', row: 1, dot: B.orange},
  {id: 'c2-3', name: 'Çip: Senin adına işlem', from: TERRA.adina, to: chapterEnd('terra'), kind: 'fact', text: 'Senin adına işlem', scene: 'terra', side: 'left', row: 2, dot: B.ink},
  {id: 'sayac', name: 'Sayaç: 16,3 milyar $ gelir', from: ANT.sayi - 0.1, to: chapterEnd('anthropic'), kind: 'counter'},
  {id: 'c3-1', name: 'Çip: Nasdaq · Kasım', from: ANT.kasim, to: chapterEnd('anthropic'), kind: 'fact', text: 'Nasdaq’ta kasımda', scene: 'anthropic', side: 'right', row: 3, dot: B.orange},
  {id: 'c4-1', name: 'Çip: Tek cümle', from: GENIE.tek, to: chapterEnd('genie'), kind: 'fact', text: 'Tek bir cümle', scene: 'genie', side: 'left', row: 0, dot: B.lemon},
  {id: 'c4-2', name: 'Çip: İçinde gezilebilir dünya', from: GENIE.gezebilecegin, to: chapterEnd('genie'), kind: 'fact', text: 'İçinde gezilebilen dünya', scene: 'genie', side: 'left', row: 1, dot: B.mint},
  {id: 'c5-1', name: 'Çip: Soruşturma', from: TR.sorusturma, to: chapterEnd('turkiye'), kind: 'fact', text: 'Soruşturma', scene: 'turkiye', side: 'right', row: 0, dot: B.ink},
  {id: 'c5-2', name: 'Çip: Geçici tedbir', from: TR.tedbir, to: chapterEnd('turkiye'), kind: 'fact', text: 'Geçici tedbir', scene: 'turkiye', side: 'right', row: 1, dot: B.orange},
  {id: 'c5-3', name: 'Çip: Haber siteleri özete hayır diyebilir', from: TR.haber + 0.4, to: chapterEnd('turkiye'), kind: 'fact', text: 'Haber siteleri özete “hayır” diyebilir', scene: 'turkiye', side: 'right', row: 2, dot: B.lemon},
  {id: 'soru', name: 'Soru: Hangisi seni en çok şaşırttı?', from: END.peki, to: 76.95, kind: 'question'},
  {id: 'c6-1', name: 'Çip: Yorumlara yaz', from: END.yorumlara, to: 76.95, kind: 'fact', text: 'Yorumlara yaz', scene: 'end', side: 'left', row: 0, dot: B.orange},
  {id: 'c6-2', name: 'Çip: Her hafta takip et', from: END.herHafta, to: 76.95, kind: 'fact', text: 'Her hafta: takip et', scene: 'end', side: 'left', row: 1, dot: B.mint},
];

export type OverlayPart = Base;
export const OVERLAY_PARTS: OverlayPart[] = PARTS.map(({id, name, from, to}) => ({id, name, from, to}));

const Title: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const out = 1 - prog(t, p.to - 0.25, 0.25);
  const line = (i: number) => {
    const q = pop(t, p.from + i * 0.18, 0.45);
    return {opacity: Math.min(1, q * 1.5) * out, transform: `translateY(${(1 - q) * 60}px)`, display: 'block'};
  };
  const marker = easeOut(prog(t, INTRO.buHafta, 0.35));
  return (
    <div style={{position: 'absolute', left: 80, top: 286, fontFamily: display, fontWeight: 800, fontSize: 112, lineHeight: 1.02, letterSpacing: -3.4, color: B.ink}}>
      <span style={line(0)}>Yapay zekâ</span>
      <span style={line(1)}>dünyasında</span>
      <span style={{...line(2), position: 'relative', isolation: 'isolate', color: B.orange}}>
        <span
          style={{
            position: 'absolute',
            left: -16,
            right: -20,
            top: 14,
            bottom: 4,
            background: B.lemon,
            borderRadius: 14,
            transform: `scaleX(${marker}) rotate(-1.5deg)`,
            transformOrigin: 'left',
            zIndex: -1,
          }}
        />
        bu hafta
      </span>
    </div>
  );
};

const Progress: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const vis = life(t, p.from, p.to);
  const color = ink(sceneAt(t));
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 196, display: 'flex', gap: 14, opacity: vis}}>
      {CHAPTERS.map((c) => {
        const [a, b] = SCENES[c.scene];
        const fill = Math.min(1, Math.max(0, (t - a) / (b - a)));
        return (
          <div key={c.n} style={{flex: 1, height: 12, borderRadius: 6, background: `${color}26`, overflow: 'hidden'}}>
            <div style={{width: `${fill * 100}%`, height: '100%', background: fill >= 1 ? color : B.orange, borderRadius: 6}} />
          </div>
        );
      })}
    </div>
  );
};

const Fact: React.FC<{t: number; p: Extract<Part, {kind: 'fact'}>}> = ({t, p}) => {
  const q = pop(t, p.from, 0.42);
  const out = 1 - prog(t, p.to - 0.2, 0.2);
  const right = p.side === 'right';
  const top = 1080 + p.row * 112;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: right ? 560 : 80,
        maxWidth: right ? 380 : 470,
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
        transformOrigin: right ? 'left center' : 'left center',
      }}
    >
      <span style={{flex: '0 0 auto', width: 20, height: 20, borderRadius: 10, background: p.dot, border: `4px solid ${B.ink}`}} />
      <span>{p.text}</span>
    </div>
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
        top: 312,
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
      {p.text}
    </div>
  );
};

const Counter: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const q = pop(t, p.from, 0.4);
  const out = 1 - prog(t, p.to - 0.2, 0.2);
  const v = 16.3 * easeOut(prog(t, ANT.sayi, 1.1));
  return (
    <div style={{position: 'absolute', left: 620, top: 1040, opacity: Math.min(1, q * 1.5) * out, transform: `scale(${0.85 + 0.15 * q})`, transformOrigin: 'left top'}}>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 160, lineHeight: 0.95, letterSpacing: -5, color: B.paper}}>{v.toFixed(1).replace('.', ',')}</div>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 64, lineHeight: 1, color: B.lemon}}>milyar $</div>
      <div style={{fontFamily: mono, fontWeight: 600, fontSize: 24, letterSpacing: 2.5, color: B.mint, marginTop: 14}}>2026 İLK YARI GELİR</div>
    </div>
  );
};

const Question: React.FC<{t: number; p: Part}> = ({t, p}) => {
  const q = pop(t, p.from, 0.45);
  const out = 1 - prog(t, p.to - 0.2, 0.2);
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        top: 250,
        width: 920,
        fontFamily: display,
        fontWeight: 800,
        fontSize: 84,
        lineHeight: 1.04,
        letterSpacing: -2.5,
        color: B.ink,
        opacity: Math.min(1, q * 1.5) * out,
        transform: `translateY(${(1 - q) * 50}px)`,
      }}
    >
      Hangisi seni <span style={{color: B.orange}}>en çok şaşırttı?</span>
    </div>
  );
};

const PartView: React.FC<{p: Part; t: number}> = ({p, t}) => {
  switch (p.kind) {
    case 'title':
      return <Title t={t} p={p} />;
    case 'date':
    case 'teaser': {
      const q = pop(t, p.from, 0.4);
      const out = 1 - prog(t, p.to - 0.2, 0.2);
      const isDate = p.kind === 'date';
      return (
        <div style={{position: 'absolute', left: 80, top: isDate ? 650 : 750, opacity: Math.min(1, q * 1.5) * out, transform: `scale(${q})`, transformOrigin: 'left center'}}>
          <Chip text={p.text} bg={isDate ? B.ink : B.orange} fg={isDate ? B.mint : B.ink} size={30} />
        </div>
      );
    }
    case 'progress':
      return <Progress t={t} p={p} />;
    case 'chapter': {
      const q = pop(t, p.from, 0.4);
      const out = 1 - prog(t, p.to - 0.2, 0.2);
      const dark = SCENE_BG[p.scene] === B.ink;
      return (
        <div style={{position: 'absolute', left: 80, top: 232, opacity: Math.min(1, q * 1.5) * out, transform: `translateX(${(1 - q) * -60}px)`}}>
          <Chip text={p.text} bg={dark ? B.orange : B.ink} fg={dark ? B.ink : B.mint} size={28} />
        </div>
      );
    }
    case 'headline':
      return <Headline t={t} p={p} />;
    case 'fact':
      return <Fact t={t} p={p} />;
    case 'counter':
      return <Counter t={t} p={p} />;
    case 'question':
      return <Question t={t} p={p} />;
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
