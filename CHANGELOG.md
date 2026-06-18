# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] - 2026-06-18

### Added

- **stdio transport (default)** — LM Studio spawns the server via `command` + `args` in `~/.lmstudio/mcp.json`; no manual `npm start`, no port 8080
- Config resolution for spawned processes: `MCP_CONFIG` env, package-root `lmstudio-mcp.json`, `~/.config/lmstudio-mcp/config.json`
- `npm run start:http` / `--http` flag for optional Streamable HTTP debug mode (`/health`, `/mcp`)
- `--help` CLI flag

### Changed

- Default entry point uses stdio; HTTP moved to `--http` only
- Tool debug logs use `stderr` (stdio-safe)
- Windows `MCP_ALLOWED_PATHS` in `.env` uses `;` separator (colon breaks drive letters)
- README / Chinese docs: stdio `mcp.json` examples, removed HTTP-first workflow

### Deprecated

- LM Studio integration via `"url": "http://127.0.0.1:8080/mcp"` — use stdio `command` + `args` instead

## [1.1.1] - 2026-06-17

### Fixed

- Windows path allowlist: normalize `\` vs `/` before prefix checks so configured paths like `F:/Projects` match resolved file paths

### Changed

- README / Chinese docs: troubleshooting for LM Studio tool approval, model compatibility (Gemma, Qwen3.5 parse errors), `MCP_DEBUG` verification, and bundled `browser` MCP errors
- Add `lmstudio-mcp.example.json`; ignore local `lmstudio-mcp.json` in git

## [1.1.0] - 2026-06-16

### Added

- Streamable HTTP MCP server for LM Studio (`/mcp`, `/health`)
- Seven tools: `read_file`, `list_directory`, `search_in_file`, `read_multiple_files`, `find_files`, `reason_over_file`, `get_file_info`
- Path allowlist, extension blocklist, and file size limits
- PDF and DOCX parsing via `pdf-parse` and `mammoth`
- English README, Chinese docs in `docs/README.zh-CN.md`
- Disclaimer: not affiliated with LM Studio; original work statement
- npm publish layout (`files` whitelist, `dist/` build, `.npmignore`)

### Changed

- npm package `lmstudio-mcp-local` v1.1.0
- Version read from `package.json` at runtime

### Fixed

- MCP Streamable HTTP: connect before `handleRequest`, stateful session map for LM Studio
- Tool registration: Zod schemas for MCP SDK 1.x

[1.2.0]: https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/compare/b11d1c4...v1.1.1
[1.1.0]: https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/releases/tag/v1.1.0
