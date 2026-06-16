# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

[1.1.0]: https://github.com/tomaxtoLuca/lmstudio-mcp-local/releases/tag/v1.1.0
