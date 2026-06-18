#!/usr/bin/env node
// src/index.ts
// LM Studio MCP Server — default: stdio (LM Studio spawn)
// Optional: --http for Streamable HTTP debug mode

import { startStdioServer } from './transports/stdio.js'
import { startHttpServer } from './transports/http.js'

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.error(`lmstudio-mcp-local — MCP server for local file access

Usage:
  lmstudio-mcp-local          stdio (default, for LM Studio mcp.json)
  lmstudio-mcp-local --http     HTTP debug mode on 127.0.0.1:8080

Configure allowlist via lmstudio-mcp.json or MCP_CONFIG env var.
`)
  process.exit(0)
}

const useHttp = args.includes('--http')

async function main() {
  if (useHttp) {
    await startHttpServer()
  } else {
    await startStdioServer()
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
