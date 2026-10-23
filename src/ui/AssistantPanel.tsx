import { tr } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { AssistantEvent, Message } from '../agent/assistant';

const KEY_STORAGE = 'klip-anthropic-key';

const readKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};

interface Entry extends AssistantEvent {
  role: 'user' | 'assistant';
}

const EXAMPLES = ['Sessizlikleri kes ve Türkçe altyazı ekle', 'Videoyu 9:16 yap ve boşlukları bulanık doldur', 'Başa "Hoş geldiniz" başlığı ekle'];

// Claude ile doğal dilde kurgu sohbeti.
export function AssistantPanel() {
  const [apiKey, setApiKey] = useState(readKey);
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useRef<Message[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scrollTo yeni tarayıcılarda Promise döndürür; effect'ten döndürülmemeli.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries]);

  const saveKey = (value: string) => {
    setApiKey(value);
    try {
      localStorage.setItem(KEY_STORAGE, value);
    } catch {
      // Depolama kapalıysa anahtar yalnız bu oturumda kalır.
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || !apiKey || busy) return;
    setInput('');
    setBusy(true);
    setEntries((list) => [...list, { role: 'user', kind: 'text', text }]);
    const { runAssistant } = await import('../agent/assistant');
    history.current = await runAssistant(apiKey, [...history.current, { role: 'user', content: text }], (event) =>
      setEntries((list) => [...list, { ...event, role: 'assistant' }]),
    );
    setBusy(false);
  };

  return (
    <div className="assistant">
      <h3>{tr('Asistan')}</h3>
      <p className="hint">{tr('İstediğinizi yazın; Claude editörün komutlarını kullanarak uygular. Her adım geri alınabilir (⌘Z).')}</p>
      <div className="field">
        <label>{tr('Anthropic API anahtarı')}</label>
        <input type="password" placeholder={tr('sk-ant-…')} value={apiKey} onChange={(e) => saveKey(e.target.value)} />
        <span className="hint">
          {tr("Anahtar yalnız bu tarayıcıda saklanır. Claude'a proje özeti ve önizleme kareleri gönderilir, medya dosyalarınız gönderilmez.")}
        </span>
      </div>
      <div className="chat-log" ref={logRef}>
        {!entries.length && (
          <div className="chips">
            {EXAMPLES.map((example) => (
              <button key={example} className="chip" disabled={!apiKey} onClick={() => void send(tr(example))}>
                {tr(example)}
              </button>
            ))}
          </div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className={`chat-entry ${entry.role} ${entry.kind}`}>
            {entry.kind === 'tool' ? `⚙ ${entry.text}` : entry.text}
          </div>
        ))}
        {busy && <div className="chat-entry assistant tool">{tr('Çalışıyor…')}</div>}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          type="text"
          placeholder={apiKey ? tr('Ne yapmak istersiniz?') : tr('Önce API anahtarını girin')}
          value={input}
          disabled={!apiKey || busy}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn primary" style={{ flex: 'none' }} disabled={!apiKey || busy || !input.trim()}>
          {tr('Gönder')}
        </button>
      </form>
      {entries.length > 0 && (
        <button
          className="btn ghost small"
          style={{ marginTop: 8 }}
          onClick={() => {
            history.current = [];
            setEntries([]);
          }}
        >
          {tr('Yeni sohbet')}
        </button>
      )}
    </div>
  );
}
