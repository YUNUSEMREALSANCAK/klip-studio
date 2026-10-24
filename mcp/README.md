# klip-studio-mcp

MCP server for [Klip Studio](https://github.com/YUNUSEMREALSANCAK/klip-studio), the open-source video editor that runs in your browser. It lets the AI app you already pay for (Claude Desktop, Claude Code, Cursor, Codex CLI, VS Code, Gemini CLI, …) edit your project: cut, add captions, run the local AI tools and export an MP4.

Your media never leaves your computer: the server talks to the editor tab over `ws://127.0.0.1:5299`.

## Setup

1. Open Klip Studio ([live demo](https://yunusemrealsancak.github.io/klip-studio/) or `npm run dev`) and turn on **Agent connection (MCP)** in the Project panel.
2. Add the server to your app, for example:

```bash
claude mcp add klip-studio -- npx -y klip-studio-mcp
```

```json
{ "mcpServers": { "klip-studio": { "command": "npx", "args": ["-y", "klip-studio-mcp"] } } }
```

Instructions for each app: [docs/mcp.md](https://github.com/YUNUSEMREALSANCAK/klip-studio/blob/main/docs/mcp.md).

## Tools

`klip_state`, `klip_commands`, `klip_execute`, `klip_screenshot`, `klip_import_file`, `klip_export`.

## Options

| | |
| --- | --- |
| `--http` | One shared server at `http://127.0.0.1:5300/mcp` instead of stdio, for using several apps at once |
| `KLIP_BRIDGE_PORT` | Editor bridge port (default 5299) |
| `KLIP_MCP_PORT` | HTTP port with `--http` (default 5300) |
| `KLIP_ALLOWED_ORIGINS` | Extra comma-separated editor origins, e.g. a self-hosted copy |

License: MIT or Apache-2.0.
