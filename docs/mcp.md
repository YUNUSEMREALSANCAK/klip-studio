# Using Klip Studio from your AI app (MCP)

Klip Studio ships an [MCP](https://modelcontextprotocol.io) server, so the AI app you already subscribe to can edit your video: cut silences, add captions, place titles, run the local AI tools and export an MP4. No API key is needed; your app's own subscription does the thinking, and your media never leaves your computer.

```
AI app ⇄ (stdio or HTTP, MCP) ⇄ klip-studio-mcp ⇄ (WebSocket 127.0.0.1:5299) ⇄ editor tab in your browser
```

## 1. Turn on the connection in the editor

Open Klip Studio ([live demo](https://yunusemrealsancak.github.io/klip-studio/) or `npm run dev`), click an empty spot so the **Project** panel shows, and turn on **Agent connection (MCP)**. The status reads "Connected" once your AI app has started the server. The panel also shows the setup snippet for each app with a copy button.

Chrome may ask the live demo for permission to reach apps on your device; allow it so the tab can talk to the local server.

## 2. Add the server to your app

Requires [Node.js](https://nodejs.org) 20.19 or newer.

| App | Setup |
| --- | --- |
| Claude Desktop | Settings → Developer → Edit Config, add the JSON below, restart Claude |
| Claude Code | `claude mcp add klip-studio -- npx -y klip-studio-mcp` |
| Codex CLI | `codex mcp add klip-studio -- npx -y klip-studio-mcp` |
| Cursor | Add the JSON below to `~/.cursor/mcp.json` |
| VS Code (Copilot) | `code --add-mcp '{"name":"klip-studio","command":"npx","args":["-y","klip-studio-mcp"]}'` |
| Gemini CLI | Add the JSON below to `~/.gemini/settings.json` |
| Any other MCP app | Command `npx`, arguments `-y klip-studio-mcp` |

```json
{
  "mcpServers": {
    "klip-studio": { "command": "npx", "args": ["-y", "klip-studio-mcp"] }
  }
}
```

Working from a clone of this repo instead? Use `node /full/path/to/klip-studio/mcp/server.mjs` as the command.

## 3. Ask

> Import ~/Movies/vlog.mp4, cut the silences, add English captions, make it 9:16 and export to ~/Movies/vlog-short.mp4.

## Tools

| Tool | What it does |
| --- | --- |
| `klip_state` | Project summary: assets, clips, duration, aspect ratio, playhead |
| `klip_commands` | Every editor command with its parameter schema |
| `klip_execute` | Runs a command (split, add_text, set_transition, set_filter, set_speed, set_keyframe, freeze_frame, reverse_clip, voice_effect, add_sound_effect, run_ai, undo, …) |
| `klip_screenshot` | The current preview frame as an image |
| `klip_import_file` | Adds a local video, audio or image file to the media library |
| `klip_export` | Renders the timeline and saves an MP4 to a local path |

Every edit is undoable, in the editor or with `{"name":"undo"}`.

## Custom transitions, filters and fonts

When you describe an effect that isn't built in, the AI writes it as a small GLSL shader:

> Add a transition where the first clip ripples away like water, and give the second clip a teal-and-orange look.

| Command | What it does |
| --- | --- |
| `create_effect` | `{ kind: "transition" \| "filter", title, code }` compiles the GLSL in the editor and returns an `effectId`. On a compile error nothing is saved and the error log, with line numbers, comes back so the AI can fix it |
| `set_transition` | `{ toClipId, effectId }` puts a custom transition on a cut |
| `set_filter` | `{ clipId, effectId, amount }` applies a custom filter (amount 0–1) |
| `update_effect` · `delete_effect` | Change or remove an effect; clips using it update immediately |
| `add_font` | `{ family }` adds any Google Fonts family by name |
| `klip_import_file` | With a `.ttf`, `.otf`, `.woff` or `.woff2` path, adds the font file to the project |

Built-in effects work the same way: `set_filter` with `lib_glitch`, `lib_vhs`, `lib_old_film`… and `set_transition` with `lib_t_swirl`, `lib_t_burn`… (full list in `klip_commands`). The GLSL API is in each command's description. Transitions follow the [gl-transitions](https://gl-transitions.com) format, so most of that library works as is. Effects, fonts and their use are saved in the project and `.klip` files, render identically in preview and export, and can also be written or edited by hand in the Transition and Filter tabs.

## Several apps at once

In stdio mode each app starts its own server, and only one can hold the editor port. To use several apps at the same time, run one shared server:

```bash
npx -y klip-studio-mcp --http      # http://127.0.0.1:5300/mcp
```

and add it to each app as an HTTP (Streamable HTTP) server, for example `claude mcp add --transport http klip-studio http://127.0.0.1:5300/mcp`.

## Web and mobile apps

claude.ai, ChatGPT and other web or mobile apps can only reach MCP servers on the public internet, so they can't connect to this local server. Use their desktop or CLI apps, or another app from the table above. Putting this server on the internet is not supported: it would let anyone with the address control your editor.

## Security

- The servers listen on `127.0.0.1` only.
- The bridge accepts browser connections only from local pages and the official live demo. Add a self-hosted copy with `KLIP_ALLOWED_ORIGINS=https://your.host`.
- The HTTP server rejects non-local host names and foreign origins (DNS rebinding protection).
- `klip_import_file` and `klip_export` read and write files with your user's permissions, like any local MCP server. Your AI app asks before running them unless you allow them.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Not connected to Klip Studio" | Open the editor and turn on Agent connection (MCP) |
| "Port 5299 is already in use" | Another app already started the server; close it or use the shared `--http` server |
| Status stays "Waiting for MCP server…" | Restart your AI app so it starts the server; on the live demo, allow Chrome's local network prompt |

| Option | Default |
| --- | --- |
| `KLIP_BRIDGE_PORT` | 5299 |
| `KLIP_MCP_PORT` (with `--http`) | 5300 |
| `KLIP_ALLOWED_ORIGINS` | none |
