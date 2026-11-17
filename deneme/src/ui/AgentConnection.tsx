import { useEffect, useState } from 'react';
import { bridgeEnabled, onBridgeStatus, setBridgeEnabled, type BridgeStatus } from '../agent/bridge';
import { tr } from '../i18n';
import { Toggle } from './controls';

const BRIDGE_TEXT: Record<BridgeStatus, string> = { off: 'Off', connecting: 'Waiting for MCP server…', connected: 'Connected' };

const MCP_COMMAND = 'npx -y klip-studio-mcp';
const MCP_JSON = JSON.stringify({ mcpServers: { 'klip-studio': { command: 'npx', args: ['-y', 'klip-studio-mcp'] } } }, null, 2);

const CLIENTS = [
  { label: 'Claude Desktop', where: 'Settings → Developer → Edit Config, paste, then restart Claude:', snippet: MCP_JSON },
  { label: 'Claude Code', where: 'Run in a terminal:', snippet: `claude mcp add klip-studio -- ${MCP_COMMAND}` },
  { label: 'Codex CLI', where: 'Run in a terminal:', snippet: `codex mcp add klip-studio -- ${MCP_COMMAND}` },
  { label: 'Cursor', where: 'Add to ~/.cursor/mcp.json:', snippet: MCP_JSON },
  { label: 'VS Code', where: 'Run in a terminal:', snippet: `code --add-mcp '{"name":"klip-studio","command":"npx","args":["-y","klip-studio-mcp"]}'` },
  { label: 'Gemini CLI', where: 'Add to ~/.gemini/settings.json:', snippet: MCP_JSON },
];

// Lets AI apps on the user's own subscription (Claude, Cursor, Codex, …) drive the editor through the MCP server.
export function AgentConnection() {
  const [enabled, setEnabled] = useState(bridgeEnabled);
  const [status, setStatus] = useState<BridgeStatus>(enabled ? 'connecting' : 'off');
  const [client, setClient] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    onBridgeStatus(setStatus);
  }, []);
  const { where, snippet } = CLIENTS[client];

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="section-title" style={{ marginTop: 16 }}>
        {tr('AI apps')}
      </div>
      <div className="hint">{tr('Edit with Claude, Cursor, Codex or any MCP app on your own subscription. Your media stays on this computer.')}</div>
      <Toggle
        label={tr('Agent connection (MCP)')}
        on={enabled}
        onChange={(on) => {
          setEnabled(on);
          setBridgeEnabled(on);
        }}
      />
      <div className="hint">
        {tr('Status:')} <b className={`bridge-${status}`}>{tr(BRIDGE_TEXT[status])}</b>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label htmlFor="mcp-client">{tr('Set up an app')}</label>
        <select id="mcp-client" value={client} onChange={(e) => setClient(Number(e.target.value))}>
          {CLIENTS.map((c, i) => (
            <option key={c.label} value={i}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hint">{tr(where)}</div>
      <pre className="snippet">{snippet}</pre>
      <button className="btn small" onClick={() => void copy()}>
        {copied ? tr('Copied') : tr('Copy')}
      </button>
    </>
  );
}
