# LMStudio-MCP-Locally

MCP server (`lmstudio-mcp-local` on npm) that lets **LM Studio read local file paths** on your machine (PDF, DOCX, Markdown, code, JSON, CSV, etc.).  
Everything runs locally — files are never uploaded to the cloud.

GitHub: [tomaxtoLuca/lmstudio-mcp-local](https://github.com/tomaxtoLuca/lmstudio-mcp-local) · 中文文档：[docs/README.zh-CN.md](docs/README.zh-CN.md)

## Overview

**lmstudio-mcp-local** (folder: `LMStudio-MCP-Locally`) is an independent, read-only MCP server that connects [LM Studio](https://lmstudio.ai/) to files on your computer through the [Model Context Protocol](https://modelcontextprotocol.io/).

|                |                                                                      |
| -------------- | -------------------------------------------------------------------- |
| **Maintainer** | [tomaxtoLuca](https://github.com/tomaxtoLuca)                        |
| **License**    | [MIT](LICENSE)                                                       |
| **Runtime**    | Node.js ≥ 22                                                         |
| **Transport**  | Streamable HTTP — default `http://127.0.0.1:8080/mcp`                |
| **Tools**      | 7 (read, list, search, find, batch read, file info, local reasoning) |

**What makes it different**

- **LM Studio–oriented HTTP endpoint** — add via Settings → Plugins → MCP URL (not only stdio/`mcp.json` CLI).
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

If you believe any content infringes your rights, please [open an issue](https://github.com/tomaxtoLuca/lmstudio-mcp-local/issues).

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

| Type          | Component                         | Requirement                                     |
| ------------- | --------------------------------- | ----------------------------------------------- |
| **Install**   | [Node.js](https://nodejs.org/)    | **≥ 22.0.0**                                    |
| **Install**   | npm                               | Bundled with Node                               |
| **Install**   | [LM Studio](https://lmstudio.ai/) | Desktop app                                     |
| **Enable**    | LM Studio local API               | Default `http://127.0.0.1:1234`                 |
| **Enable**    | Loaded model                      | Load a model in LM Studio                       |
| **Enable**    | This MCP server                   | `npm start` → `/mcp` endpoint                   |
| **Configure** | Path allowlist                    | `allowedPaths` in `.env` or `lmstudio-mcp.json` |

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
| MCP port      | Default **8080** (configurable)                              |
| LM Studio API | Default **1234**                                             |

---

## Quick start

### Option A: npm (recommended)

```bash
npm install -g lmstudio-mcp-local
lmstudio-mcp-local
```

Or run once without installing:

```bash
npx lmstudio-mcp-local
```

Copy `.env.example` to `.env` and set `MCP_ALLOWED_PATHS` before starting (see below).

### Option B: from source

```bash
git clone https://github.com/tomaxtoLuca/lmstudio-mcp-local.git LMStudio-MCP-Locally
cd LMStudio-MCP-Locally
npm install
```

### 1. Configure allowed local paths

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Edit `.env` (colon-separated paths):

```env
# Windows
MCP_ALLOWED_PATHS=F:/Documents:F:/Projects

# macOS / Linux
# MCP_ALLOWED_PATHS=/Users/me/Documents:/Users/me/Projects
```

Or use `lmstudio-mcp.json`:

```json
{
  "security": {
    "allowedPaths": ["F:/Documents", "F:/Projects"]
  }
}
```

### 2. Start LM Studio

1. Open LM Studio
2. **Load** a model
3. Enable **Local Server / API** (default port 1234)
4. Enable **Tool use** in Chat settings (if supported)

### 3. Start MCP Server

```bash
npm start
# or after global install: lmstudio-mcp-local
```

Expected output:

```
  ✓ MCP Server listening on http://127.0.0.1:8080/mcp
```

### 4. Add MCP Server in LM Studio

1. **Settings → Plugins** (or **Tools → MCP Servers**)
2. **Add MCP Server**
3. URL (default): `http://127.0.0.1:8080/mcp`  
   If you changed the port: `http://127.0.0.1:<your-port>/mcp`
4. **Save** and **Enable**
5. Seven tools should appear in Chat

### 5. Verify local path access

In Chat:

```
Read the file at F:/Documents/test.txt
```

If you see `Path not in allowlist`, add that directory to `MCP_ALLOWED_PATHS` and restart the MCP server.

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

### Change MCP port (default 8080)

**`.env`**

```env
MCP_PORT=9090
```

**`lmstudio-mcp.json`**

```json
{
  "server": {
    "port": 9090
  }
}
```

Restart the server and update the MCP URL in LM Studio (e.g. `http://127.0.0.1:9090/mcp`).

### Full config example

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 8080
  },
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
- **Local only** — binds to `127.0.0.1` by default
- **`reason_over_file`** — calls local LM Studio API only

---

## Troubleshooting

**Port in use** — change `MCP_PORT` or free the port.

**LM Studio not reachable** — ensure app is open, model loaded, API enabled.

**Path not in allowlist** — add directory to `MCP_ALLOWED_PATHS`.

**Model not using tools** — enable Tool use in Chat settings.

---

## Development

```bash
npm run dev    # watch mode (runs from src/)
npm run build  # compile to dist/
```

---

## Links

- [GitHub Repository](https://github.com/tomaxtoLuca/lmstudio-mcp-local)
- [Report an issue](https://github.com/tomaxtoLuca/lmstudio-mcp-local/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [LM Studio](https://lmstudio.ai/) _(third-party product; not affiliated)_
