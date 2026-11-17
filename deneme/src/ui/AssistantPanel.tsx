import { tr, trMessage } from '../i18n';
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

const EXAMPLES = ['Cut the silences and add English captions', 'Make it 9:16 and fill the gaps with blur', 'Add a "Welcome" title at the start'];

// Natural-language editing chat with Claude.
export function AssistantPanel() {
  const [apiKey, setApiKey] = useState(readKey);
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useRef<Message[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scrollTo returns a Promise in newer browsers; it must not be returned from an effect.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries]);

  const saveKey = (value: string) => {
    setApiKey(value);
    try {
      localStorage.setItem(KEY_STORAGE, value);
    } catch {
      // If storage is unavailable, the key lives only for this session.
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
      <h3>{tr('Assistant')}</h3>
      <p className="hint">{tr('Describe what you want; Claude carries it out with the editor commands. Every step can be undone (⌘Z).')}</p>
      <div className="field">
        <label>{tr('Anthropic API key')}</label>
        <input type="password" placeholder={tr('sk-ant-…')} value={apiKey} onChange={(e) => saveKey(e.target.value)} />
        <span className="hint">
          {tr('The key is stored only in this browser. Claude receives a project summary and preview frames, never your media files.')}
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
            {entry.kind === 'tool' ? `⚙ ${entry.text}` : entry.kind === 'error' ? trMessage(entry.text) : entry.text}
          </div>
        ))}
        {busy && <div className="chat-entry assistant tool">{tr('Working…')}</div>}
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
          placeholder={apiKey ? tr('What would you like to do?') : tr('Enter your API key first')}
          value={input}
          disabled={!apiKey || busy}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn primary" style={{ flex: 'none' }} disabled={!apiKey || busy || !input.trim()}>
          {tr('Send')}
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
          {tr('New chat')}
        </button>
      )}
    </div>
  );
}
