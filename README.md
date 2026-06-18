# LMStudio-MCP-Locally

MCP server (`lmstudio-mcp-local` on npm) that lets **LM Studio read local file paths** on your machine (PDF, DOCX, Markdown, code, JSON, CSV, etc.).  
Everything runs locally — files are never uploaded to the cloud.

GitHub: [tomaxtoLuca/LMStudio-MCP-LocalPath](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath) · 中文文档：[docs/README.zh-CN.md](docs/README.zh-CN.md)

## Overview

**lmstudio-mcp-local** (folder: `LMStudio-MCP-Locally`) is an independent, read-only MCP server that connects [LM Studio](https://lmstudio.ai/) to files on your computer through the [Model Context Protocol](https://modelcontextprotocol.io/).

|                |                                                                      |
| -------------- | -------------------------------------------------------------------- |
| **Maintainer** | [tomaxtoLuca](https://github.com/tomaxtoLuca)                        |
| **License**    | [MIT](LICENSE)                                                       |
| **Runtime**    | Node.js ≥ 22                                                         |
| **Transport**  | **stdio** — LM Studio spawns via `command` + `args` in `mcp.json`    |
| **Tools**      | 7 (read, list, search, find, batch read, file info, local reasoning) |

**What makes it different**

- **LM Studio stdio via `mcp.json`** — register `command` + `args` in `~/.lmstudio/mcp.json` (same pattern as `browser`); no manual server start, no port 8080.
- **Path allowlist** — only directories you configure are readable; extension and size limits apply.
- **`reason_over_file`** — reads local files then calls your **local** LM Studio API; content stays on your machine.
- **Document formats** — PDF, DOCX, and plain text / code via `pdf-parse` and `mammoth`.

**Not included:** cloud upload, vector DB, file write/delete, official LM Studio support.

## License

[MIT](LICENSE)

## Disclaimer & attribution

> **Not legal advice.** This section clarifies project origin and limits liability. Use the software at your own risk.

### Not affiliated with LM Studio

This project is **not** developed, endorsed, sponsored, or maintained by **LM Studio**, **LM Studio AB**, or any related entity.  
“LM Studio” is used only to describe **compatibility** (this MCP server is intended to work with the LM Studio desktop app).  
No trademark ownership or official partnership is claimed.

### Original work

**lmstudio-mcp-local** is an **independently developed, original implementation** by the maintainer. It is **not** a fork of, copy of, or distribution from LM Studio.  
Third-party **libraries** (MCP SDK, `pdf-parse`, `mammoth`, etc.) are used under their respective open-source licenses; their source code is **not** embedded in this repository’s `src/`.

### Author’s statement

The maintainer ([tomaxtoLuca](https://github.com/tomaxtoLuca)) states that, to the best of their knowledge:

- This project is **not a work made for hire** and is published with authority to open-source it.
- It contains **no third-party code used without authorization**.
- There are **no employer or contractual restrictions** that prohibit releasing this project under MIT.

If you believe any content infringes your rights, please [open an issue](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/issues).

### User responsibility

- Configure **`allowedPaths`** carefully; only expose directories you are permitted to read.
- Keep the server on **`127.0.0.1`** unless you understand the risk of exposing it on a network.
- You are responsible for **compliance** with applicable laws, workplace policies, and privacy rules when reading personal or confidential files.
- Software is provided **“AS IS”** under the MIT License; see [LICENSE](LICENSE) for the full disclaimer of warranties and limitation of liability.

---

## What it does

Exposes your local file system to LM Studio via the **Model Context Protocol (MCP)**.  
Files are read **directly from disk** (not vector search, not cloud storage).

```
Local disk files
    ↓  direct fs read (within path allowlist)
LMStudio-MCP-Locally (MCP Server)
    ↓  MCP protocol
LM Studio Chat model
```

---

## Required components

| Type          | Component                         | Requirement                                           |
| ------------- | --------------------------------- | ----------------------------------------------------- |
| **Install**   | [Node.js](https://nodejs.org/)    | **≥ 22.0.0**                                          |
| **Install**   | npm                               | Bundled with Node                                     |
| **Install**   | [LM Studio](https://lmstudio.ai/) | Desktop app                                           |
| **Enable**    | LM Studio local API               | Default `http://127.0.0.1:1234`                       |
| **Enable**    | Loaded model                      | Load a model in LM Studio                             |
| **Enable**    | This MCP server                   | LM Studio spawns it via `mcp.json` (stdio)            |
| **Configure** | Path allowlist                    | `allowedPaths` in `lmstudio-mcp.json` or `MCP_CONFIG` |
| **Configure** | LM Studio MCP list                | `command` + `args` in `~/.lmstudio/mcp.json` (step 3) |

**Not required:** Python, Docker, vector DB, external database.

### Model requirements

| Use case              | Requirement                                 |
| --------------------- | ------------------------------------------- |
| Chat auto-reads files | Model must support **Tool use**             |
| `reason_over_file`    | Uses whichever model is loaded in LM Studio |
| Long documents        | Limited by model **context window**         |

---

## System requirements

| Item          | Requirement                                                  |
| ------------- | ------------------------------------------------------------ |
| OS            | Windows 10+ / macOS / Linux                                  |
| Node.js       | ≥ 22                                                         |
| Network       | Needed for `npm install`; **not needed to read local files** |
| LM Studio API | Default **1234** (`reason_over_file` only)                   |

---

## Quick start

### Option A: npm (recommended)

```bash
npm install -g lmstudio-mcp-local
npm run build   # if installing from source clone
```

LM Studio will spawn the server — you do **not** need to run `npm start` manually.

Or run once without installing:

```bash
npx lmstudio-mcp-local
```

Copy `lmstudio-mcp.example.json` to `lmstudio-mcp.json` and set `allowedPaths` (recommended over `.env` on Windows).

### Option B: from source

```bash
git clone https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath.git LMStudio-MCP-Locally
cd LMStudio-MCP-Locally
npm install
npm run build
```

### 1. Configure allowed local paths

> **Two different config files**
>
> | File                                                                  | Purpose                                                         |
> | --------------------------------------------------------------------- | --------------------------------------------------------------- |
> | **`~/.lmstudio/mcp.json`** (e.g. `C:\Users\<you>\.lmstudio\mcp.json`) | LM Studio’s MCP server list — add `command` + `args` in step 3  |
> | **`lmstudio-mcp.json`** (next to install / via `MCP_CONFIG`)          | This server’s path allowlist — **not** edited in LM Studio’s UI |

Copy `lmstudio-mcp.example.json` to `lmstudio-mcp.json` in the project root (or set `MCP_CONFIG` in `mcp.json` to its full path):

```json
{
  "security": {
    "allowedPaths": ["F:/Documents", "F:/Projects"]
  }
}
```

Optional `.env` (Windows: use **semicolon**-separated paths, or prefer JSON above):

```env
# Windows
MCP_ALLOWED_PATHS=F:/Documents;F:/Projects

# macOS / Linux
# MCP_ALLOWED_PATHS=/Users/me/Documents:/Users/me/Projects
```

### 2. Start LM Studio

1. Open LM Studio
2. **Load** a model
3. Enable **Local Server / API** (default port 1234) — needed for `reason_over_file`
4. Enable **Tool use** in Chat settings (if supported)

### 3. Add MCP Server in LM Studio

LM Studio **spawns** this server as a child process over stdio — no separate `npm start`, no port 8080.

1. LM Studio → **Program** → **Install** → **Edit mcp.json**
2. Config file: `~/.lmstudio/mcp.json` (Windows: `C:\Users\<you>\.lmstudio\mcp.json`)
3. Add a `command` entry under `mcpServers`. **Keep** any existing servers (e.g. `browser`). **Remove** any old `"url": "http://127.0.0.1:8080/mcp"` entry:

```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["G:/Lmstudio/LM Studio/.lmstudio/plugins/mcp/browser/index.js"]
    },
    "lmstudio-mcp-local": {
      "command": "node",
      "args": ["F:/path/to/lmstudio-mcp-locally/dist/index.js"],
      "env": {
        "MCP_CONFIG": "F:/path/to/lmstudio-mcp-locally/lmstudio-mcp.json",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

- **`browser`** — stdio MCP; LM Studio launches it via `command` + `args`
- **`lmstudio-mcp-local`** — stdio MCP; LM Studio launches it automatically on startup
- **`MCP_CONFIG`** — full path to your `lmstudio-mcp.json` (required if LM Studio’s cwd is not the project folder)
- After global install: `"command": "lmstudio-mcp-local"` with `"args": []` (ensure npm global bin is on PATH)

4. Save valid JSON (no comments, no trailing commas), then restart or reload LM Studio
5. In Chat, you should see **7 local file tools** alongside any other MCP tools

### 4. Verify local path access

In Chat:

```
Read the file at F:/Documents/test.txt
```

If you see `Path not in allowlist`, add that directory to `lmstudio-mcp.json` and restart LM Studio (to respawn the MCP process).

---

## Available tools

| Tool                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `read_file`           | Read a single local file                    |
| `list_directory`      | Browse a directory                          |
| `search_in_file`      | Keyword search inside a file                |
| `read_multiple_files` | Read several files at once                  |
| `find_files`          | Find files by name / glob pattern           |
| `reason_over_file`    | Read files + reason via local LM Studio API |
| `get_file_info`       | File metadata without reading content       |

---

## Configuration

### Config file locations (`lmstudio-mcp.json`)

Loaded in order (first found wins):

1. `MCP_CONFIG` env var (set in `~/.lmstudio/mcp.json` → `env`)
2. `{install-dir}/lmstudio-mcp.json` (next to `package.json`)
3. `~/.config/lmstudio-mcp/config.json`
4. `./lmstudio-mcp.json` (current working directory)

### Advanced: HTTP debug mode (`--http`)

For `/health` checks or curl debugging only — **not** the LM Studio integration path:

```bash
npm run start:http
# or: node dist/index.js --http
```

Then open `http://127.0.0.1:8080/health`. Change port via `MCP_PORT` in `.env` or `lmstudio-mcp.json`:

```json
{
  "server": {
    "port": 9090
  }
}
```

### Full config example (`lmstudio-mcp.json`)

This file configures **this MCP server** (allowlist, etc.) — not LM Studio’s `~/.lmstudio/mcp.json`. The `server.port` field applies only to `--http` debug mode.

```json
{
  "security": {
    "allowedPaths": ["F:/Documents"],
    "maxFileSize": 52428800,
    "blockedExtensions": [".exe", ".key", ".env"],
    "enforcePathGuard": true
  },
  "reading": {
    "maxCharsPerRead": 200000,
    "maxListEntries": 500,
    "followSymlinks": false
  },
  "reasoning": {
    "lmStudioUrl": "http://127.0.0.1:1234",
    "model": "local-model",
    "maxContextTokens": 8192,
    "temperature": 0.1
  }
}
```

---

## Security

- **Path allowlist** — only configured directories are readable
- **Blocked extensions** — `.exe`, `.key`, `.env`, etc.
- **Max file size** — default 50MB
- **Local only** — stdio transport; no network listener in normal use
- **`reason_over_file`** — calls local LM Studio API only

---

## Troubleshooting

**Tools not appearing in Chat** — confirm `dist/index.js` path in `mcp.json` is correct, `npm run build` was run, and LM Studio restarted. Remove any old `"url": "http://127.0.0.1:8080/mcp"` entry.

**Spawn / init failure** — check Node.js ≥ 22 is on PATH. Test manually: `node /full/path/to/dist/index.js --help`. Ensure `args` points to `dist/index.js`, not `src/index.ts`.

**Wrong allowlist after spawn** — LM Studio’s cwd may not be the project folder. Set `MCP_CONFIG` in `mcp.json` `env` to the full path of your `lmstudio-mcp.json`.

**LM Studio not reachable** — ensure app is open, model loaded, API enabled (for `reason_over_file` only).

**Path not in allowlist** — add directory to `lmstudio-mcp.json`. On Windows, use forward slashes (e.g. `F:/Projects`); the server normalizes `\` vs `/` when checking paths.

**Model says it cannot access local files** — the MCP server is fine; the model did not call a tool. Enable **Tool use** in Chat. Prefer models with reliable function calling (community reports success with tool-capable instruct/coder GGUFs; Gemma often refuses; Qwen3.5 may emit XML tool syntax LM Studio cannot parse).

**`Failed to parse tool call`** (e.g. `Expected "<parameter=", but got "<path="`) — model output format does not match LM Studio’s parser. Switch to another model or explicitly ask it to call `read_file` with JSON arguments.

**Tool call pending / nothing happens** — LM Studio requires approval the first time. Click **Allow** or **Always allow any tool from mcp/lmstudio-mcp-local**. Without approval, `read_file` never runs.

**Verify tool execution** — set `MCP_DEBUG=true` in `mcp.json` `env` or `.env`, restart LM Studio. Debug logs go to **stderr** (stdio mode must not write to stdout). Look for `[tool] read_file → …ms ✓` in LM Studio’s MCP logs.

**`Plugin(mcp/browser): server.getTools is not a function`** — LM Studio’s bundled browser MCP plugin issue; unrelated to this server. Remove `browser` from `~/.lmstudio/mcp.json` while testing local files, or update LM Studio.

**Model not using tools** — enable Tool use in Chat settings; reduce competing plugins (`browser`, `rag-v1`) during testing.

**HTTP debug only: port in use** — another `--http` instance may be running:

```powershell
# Windows
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

---

## Development

```bash
npm run dev    # watch mode (runs from src/)
npm run build  # compile to dist/
```

---

## Links

- [GitHub Repository](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath)
- [Report an issue](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [LM Studio](https://lmstudio.ai/) _(third-party product; not affiliated)_
