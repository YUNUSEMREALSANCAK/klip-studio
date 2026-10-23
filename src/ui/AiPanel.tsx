import { tr } from '../i18n';
import { useState, type ReactNode } from 'react';
import { TRANSLATION_LANGUAGES, translationModel, TTS_VOICES } from '../ai/models';
import { LANGUAGES, WHISPER_MODELS } from '../ai/transcribe';
import { selectedClip, useEditor } from '../core/store';
import type { MediaClip } from '../core/types';
import {
  autoCaptions,
  beatMarkers,
  denoise,
  downloadSrt,
  enhance,
  generateSpeech,
  removeFillers,
  removeSilences,
  smartReframe,
  splitScenes,
  translateCaptions,
} from './aiActions';
import { useUi } from './uiStore';

function Card({ title, model, children }: { title: string; model: string; children: ReactNode }) {
  return (
    <section className="ai-card">
      <header>
        <h4>{title}</h4>
        <span className="badge">{model}</span>
      </header>
      {children}
    </section>
  );
}

export function AiPanel() {
  const selected = useEditor(selectedClip);
  const hasClips = useEditor((s) => s.project.clips.some((c) => c.type === 'media'));
  const hasCaptions = useEditor((s) => s.project.clips.some((c) => c.type === 'text'));
  const assets = useEditor((s) => s.assets);
  const media = selected?.type === 'media' ? selected : null;
  const asset = media ? assets[media.assetId] : null;
  const busy = useEditor((s) => s.tasks.some((t) => !t.error));

  const [model, setModel] = useState(WHISPER_MODELS[1].id);
  const [language, setLanguage] = useState('turkish');
  const [threshold, setThreshold] = useState(-40);
  const [minSilence, setMinSilence] = useState(0.6);
  const [extraFillers, setExtraFillers] = useState('');
  const [srcLang, setSrcLang] = useState('tr');
  const [tgtLang, setTgtLang] = useState('en');
  const [bilingual, setBilingual] = useState(true);
  const [ttsText, setTtsText] = useState('');
  const [voice, setVoice] = useState('eng');

  const needClip = (kind: 'video' | 'visual' | 'audio') => {
    if (!media || !asset) return 'Önce zaman çizelgesinden bir klip seçin';
    if (kind === 'video' && asset.kind !== 'video') return 'Video klip seçin';
    if (kind === 'visual' && asset.kind === 'audio') return 'Video veya görsel klip seçin';
    if (kind === 'audio' && !asset.hasAudio) return 'Sesli bir klip seçin';
    return null;
  };

  const clipButton = (label: string, kind: 'video' | 'visual' | 'audio', onClick: (clip: MediaClip) => void) => {
    const reason = needClip(kind);
    return (
      <button className="btn block" disabled={!!reason || busy} title={reason ? tr(reason) : ''} onClick={() => media && onClick(media)}>
        {tr(label)}
      </button>
    );
  };

  return (
    <>
      <h3>{tr('Yapay Zeka')}</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        {tr('Tüm modeller tarayıcınızda çalışır; videonuz hiçbir sunucuya yüklenmez. Modeller ilk kullanımda bir kez indirilir.')}
      </p>

      <Card title={tr('Otomatik altyazı')} model="Whisper">
        <p>{tr('Konuşmayı kelime zamanlarıyla metne çevirir ve karaoke tarzı altyazı ekler.')}</p>
        <div className="row">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {WHISPER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {tr(m.label)}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {tr(l.label)}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={!hasClips || busy} onClick={() => void autoCaptions(model, language)}>
            {tr('Oluştur')}
          </button>
        </div>
        <button className="btn small" disabled={!hasCaptions} onClick={downloadSrt}>
          {tr('SRT olarak indir')}
        </button>
      </Card>

      <Card title={tr('Altyazı çevirisi')} model={translationModel(srcLang, tgtLang).model.includes('nllb') ? 'NLLB' : 'opus-mt'}>
        <p>
          {tr('Altyazıları başka dile çevirir. Model boyutu:')} {translationModel(srcLang, tgtLang).size}.
        </p>
        <div className="row">
          <select value={srcLang} onChange={(e) => setSrcLang(e.target.value)} aria-label={tr('Kaynak dil')}>
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {tr(l.label)}
              </option>
            ))}
          </select>
          <span style={{ flex: 'none' }}>→</span>
          <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)} aria-label={tr('Hedef dil')}>
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {tr(l.label)}
              </option>
            ))}
          </select>
        </div>
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={bilingual} onChange={(e) => setBilingual(e.target.checked)} style={{ flex: 'none' }} />
          <span>{tr('İki dilli (orijinali koru)')}</span>
        </label>
        <button className="btn block" disabled={!hasCaptions || busy} onClick={() => void translateCaptions(srcLang, tgtLang, bilingual)}>
          {tr('Çevir')}
        </button>
      </Card>

      <Card title={tr('Seslendirme')} model="MMS-TTS">
        <p>{tr('Yazdığınız metni seslendirip oynatma çizgisine ses klibi olarak ekler. Türkçe ses modeli henüz yok.')}</p>
        <textarea rows={3} placeholder={tr('Seslendirilecek metin')} value={ttsText} onChange={(e) => setTtsText(e.target.value)} />
        <div className="row">
          <select value={voice} onChange={(e) => setVoice(e.target.value)} aria-label={tr('Ses dili')}>
            {TTS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {tr(v.label)}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={!ttsText.trim() || busy} onClick={() => void generateSpeech(ttsText, voice)}>
            {tr('Seslendir')}
          </button>
        </div>
      </Card>

      <Card title={tr('Akıllı kesim')} model="RMS + Whisper">
        <p>{tr('Sessiz bölümleri ve "eee, şey, um" gibi dolgu kelimelerini otomatik keser.')}</p>
        <div className="field">
          <label>
            {tr('Sessizlik eşiği')}{' '}
            <span>
              {threshold} {tr('dB')}
            </span>
          </label>
          <input type="range" min={-60} max={-20} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
        </div>
        <div className="field">
          <label>
            {tr('En kısa sessizlik')}{' '}
            <span>
              {minSilence.toFixed(1)} {tr('sn')}
            </span>
          </label>
          <input type="range" min={0.2} max={2} step={0.1} value={minSilence} onChange={(e) => setMinSilence(+e.target.value)} />
        </div>
        <button className="btn block" disabled={!hasClips || busy} onClick={() => void removeSilences(threshold, minSilence)}>
          {tr('Sessizlikleri kes')}
        </button>
        <input type="text" placeholder={tr('Ek dolgu kelimeleri (virgülle)')} value={extraFillers} onChange={(e) => setExtraFillers(e.target.value)} />
        <button
          className="btn block"
          disabled={!hasCaptions || busy}
          title={hasCaptions ? '' : tr('Önce otomatik altyazı oluşturun')}
          onClick={() =>
            void removeFillers(
              extraFillers
                .split(',')
                .map((w) => w.trim())
                .filter(Boolean),
            )
          }
        >
          {tr('Dolgu kelimelerini kes')}
        </button>
      </Card>

      <Card title={tr('Arka planı kaldır')} model="MediaPipe Selfie">
        <p>{tr('Videodaki kişiyi gerçek zamanlı ayırır; arka plan alttaki katmanla değişir.')}</p>
        {clipButton(media?.removeBackground ? tr('Arka planı geri getir') : tr('Arka planı kaldır'), 'visual', (clip) =>
          useEditor.getState().updateClip(clip.id, { removeBackground: !clip.removeBackground } as Partial<MediaClip>),
        )}
      </Card>

      <Card title={tr('Nesne seç ve sil')} model="SlimSAM + BiRefNet">
        <p>{tr('Görsele veya video karesine tıklayarak nesne seçin; silin (görsel temizleme) ya da çıkartma olarak kesin.')}</p>
        {clipButton('Nesne düzenleyiciyi aç', 'visual', (clip) => useUi.getState().openObjectEditor(clip.id))}
      </Card>

      <Card title={tr('Gürültü azaltma')} model="RNNoise">
        <p>{tr('Rüzgar, uğultu ve arka plan gürültüsünü temizler. Temiz ses, ses izine eklenir.')}</p>
        {clipButton('Sesi temizle', 'audio', (clip) => void denoise(clip.id))}
      </Card>

      <Card title={tr('Video analizi')} model="Yerel">
        {clipButton('Sahneleri otomatik böl', 'video', (clip) => void splitScenes(clip.id))}
        {clipButton('Akıllı çerçeveleme (9:16, yüz takibi)', 'video', (clip) => void smartReframe(clip.id))}
        {clipButton('Otomatik renk iyileştirme', 'visual', (clip) => void enhance(clip.id))}
        {clipButton('Müzikte ritim işaretle', 'audio', (clip) => void beatMarkers(clip.id))}
      </Card>
    </>
  );
}
