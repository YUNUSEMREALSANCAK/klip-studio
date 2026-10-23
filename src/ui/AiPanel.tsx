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
    if (!media || !asset) return 'Select a clip on the timeline first';
    if (kind === 'video' && asset.kind !== 'video') return 'Select a video clip';
    if (kind === 'visual' && asset.kind === 'audio') return 'Select a video or image clip';
    if (kind === 'audio' && !asset.hasAudio) return 'Select a clip with audio';
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
      <h3>{tr('AI')}</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        {tr('All models run in your browser; your video is never uploaded. Models download once on first use.')}
      </p>

      <Card title={tr('Auto captions')} model="Whisper">
        <p>{tr('Transcribes speech with word timings and adds karaoke-style captions.')}</p>
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
            {tr('Generate')}
          </button>
        </div>
        <button className="btn small" disabled={!hasCaptions} onClick={downloadSrt}>
          {tr('Download as SRT')}
        </button>
      </Card>

      <Card title={tr('Caption translation')} model={translationModel(srcLang, tgtLang).model.includes('nllb') ? 'NLLB' : 'opus-mt'}>
        <p>
          {tr('Translates captions into another language. Model size:')} {translationModel(srcLang, tgtLang).size}.
        </p>
        <div className="row">
          <select value={srcLang} onChange={(e) => setSrcLang(e.target.value)} aria-label={tr('Source language')}>
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {tr(l.label)}
              </option>
            ))}
          </select>
          <span style={{ flex: 'none' }}>→</span>
          <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)} aria-label={tr('Target language')}>
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {tr(l.label)}
              </option>
            ))}
          </select>
        </div>
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={bilingual} onChange={(e) => setBilingual(e.target.checked)} style={{ flex: 'none' }} />
          <span>{tr('Bilingual (keep the original)')}</span>
        </label>
        <button className="btn block" disabled={!hasCaptions || busy} onClick={() => void translateCaptions(srcLang, tgtLang, bilingual)}>
          {tr('Translate')}
        </button>
      </Card>

      <Card title={tr('Voiceover')} model="MMS-TTS">
        <p>{tr('Speaks your text and adds it as an audio clip at the playhead. No Turkish voice model yet.')}</p>
        <textarea rows={3} placeholder={tr('Text to speak')} value={ttsText} onChange={(e) => setTtsText(e.target.value)} />
        <div className="row">
          <select value={voice} onChange={(e) => setVoice(e.target.value)} aria-label={tr('Voice language')}>
            {TTS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {tr(v.label)}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={!ttsText.trim() || busy} onClick={() => void generateSpeech(ttsText, voice)}>
            {tr('Speak')}
          </button>
        </div>
      </Card>

      <Card title={tr('Smart cut')} model="RMS + Whisper">
        <p>{tr('Automatically cuts silences and filler words like "um" and "uh".')}</p>
        <div className="field">
          <label>
            {tr('Silence threshold')}{' '}
            <span>
              {threshold} {tr('dB')}
            </span>
          </label>
          <input type="range" min={-60} max={-20} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
        </div>
        <div className="field">
          <label>
            {tr('Shortest silence')}{' '}
            <span>
              {minSilence.toFixed(1)} {tr('s')}
            </span>
          </label>
          <input type="range" min={0.2} max={2} step={0.1} value={minSilence} onChange={(e) => setMinSilence(+e.target.value)} />
        </div>
        <button className="btn block" disabled={!hasClips || busy} onClick={() => void removeSilences(threshold, minSilence)}>
          {tr('Cut silences')}
        </button>
        <input type="text" placeholder={tr('Extra filler words (comma-separated)')} value={extraFillers} onChange={(e) => setExtraFillers(e.target.value)} />
        <button
          className="btn block"
          disabled={!hasCaptions || busy}
          title={hasCaptions ? '' : tr('Generate auto captions first')}
          onClick={() =>
            void removeFillers(
              extraFillers
                .split(',')
                .map((w) => w.trim())
                .filter(Boolean),
            )
          }
        >
          {tr('Cut filler words')}
        </button>
      </Card>

      <Card title={tr('Remove background')} model="MediaPipe Selfie">
        <p>{tr('Separates the person in real time; the background is replaced by the layer below.')}</p>
        {clipButton(media?.removeBackground ? tr('Restore background') : tr('Remove background'), 'visual', (clip) =>
          useEditor.getState().updateClip(clip.id, { removeBackground: !clip.removeBackground } as Partial<MediaClip>),
        )}
      </Card>

      <Card title={tr('Select & remove object')} model="SlimSAM + BiRefNet">
        <p>{tr('Click an object in an image or video frame; remove it (clean-up) or cut it out as a sticker.')}</p>
        {clipButton('Open object editor', 'visual', (clip) => useUi.getState().openObjectEditor(clip.id))}
      </Card>

      <Card title={tr('Noise reduction')} model="RNNoise">
        <p>{tr('Removes wind, hum and background noise. Clean audio is added to the audio track.')}</p>
        {clipButton('Clean audio', 'audio', (clip) => void denoise(clip.id))}
      </Card>

      <Card title={tr('Video analysis')} model="Yerel">
        {clipButton('Split scenes automatically', 'video', (clip) => void splitScenes(clip.id))}
        {clipButton('Smart reframe (9:16, face tracking)', 'video', (clip) => void smartReframe(clip.id))}
        {clipButton('Auto color enhance', 'visual', (clip) => void enhance(clip.id))}
        {clipButton('Mark beats in music', 'audio', (clip) => void beatMarkers(clip.id))}
      </Card>
    </>
  );
}
