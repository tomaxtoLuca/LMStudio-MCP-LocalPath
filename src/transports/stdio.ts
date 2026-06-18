// src/transports/stdio.ts
// Primary transport: LM Studio spawns this process and talks over stdin/stdout

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { config } from '../config/index.js'
import { createMCPServer } from '../mcp-server.js'

function printStdioBanner() {
  if (process.env.MCP_DEBUG !== 'true') return

  console.error(`lmstudio-mcp-local v${config.server.version} (stdio)`)
  console.error(`Allowed paths: ${config.security.allowedPaths.join(', ')}`)
}

export async function startStdioServer() {
  printStdioBanner()

  const server = createMCPServer()
  const transport = new StdioServerTransport()

  transport.onerror = (err) => {
    console.error('[mcp] stdio transport error:', err.message)
  }

  await server.connect(transport)
}
