#!/usr/bin/env node
// src/index.ts
// LM Studio MCP Server
// Transport: TCP on 127.0.0.1:8080 (StreamableHTTP via MCP SDK)
// Protocol: MCP 2024-11-05

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from 'http'
import { config } from './config/index.js'
import { ALL_TOOLS, dispatchTool } from './tools/index.js'
import { listRootResources, listDirResources, readResource, uriToPath } from './resources/index.js'
import { existsSync, statSync } from 'fs'

// ── Banner ─────────────────────────────────────────────────

function printBanner() {
  const grey  = (s: string) => `\x1b[90m${s}\x1b[0m`
  const green = (s: string) => `\x1b[32m${s}\x1b[0m`
  const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`
  const yellow= (s: string) => `\x1b[33m${s}\x1b[0m`

  console.log()
  console.log(green('  ┌─────────────────────────────────────────┐'))
  console.log(green('  │') + `  LMStudio-MCP-Locally v${config.server.version}`.padEnd(41) + green('│'))
  console.log(green('  │') + grey('  Local file access + context reasoning  ') + green('│'))
  console.log(green('  └─────────────────────────────────────────┘'))
  console.log()
  console.log(cyan('  Transport  ') + `TCP  ${config.server.host}:${config.server.port}`)
  console.log(cyan('  LM Studio  ') + config.reasoning.lmStudioUrl)
  console.log(cyan('  Tools      ') + `${ALL_TOOLS.length} tools available`)
  console.log()
  console.log(yellow('  Allowed paths:'))
  config.security.allowedPaths.forEach(p =>
    console.log(`  ${grey('→')}  ${p}`)
  )
  console.log()
  console.log(grey('  Add to LM Studio:'))
  console.log(grey(`  Settings → Plugins → Add MCP → http://${config.server.host}:${config.server.port}/mcp`))
  console.log()
}

// ── Create MCP server ──────────────────────────────────────

function createMCPServer() {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  })

  // ── Register all tools ───────────────────────────────────
  for (const tool of ALL_TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.properties as any,
      async (args: Record<string, any>) => {
        const start = Date.now()
        const result = await dispatchTool(tool.name, args)
        const ms = Date.now() - start
        if (process.env.MCP_DEBUG === 'true') {
          const failed = 'isError' in result && result.isError
          console.log(`  [tool] ${tool.name} → ${ms}ms ${failed ? '❌' : '✓'}`)
        }
        return result
      }
    )
  }

  // ── Resources: expose allowed paths ──────────────────────
  server.resource(
    'local-files',
    'file:///',
    async (uri: URL) => {
      try {
        const filePath = uriToPath(uri.toString())
        const isDir = existsSync(filePath) && statSync(filePath).isDirectory()

        if (!existsSync(filePath) || isDir) {
          // Return directory listing
          const path = isDir ? filePath : config.security.allowedPaths[0]
          const resources = isDir ? listDirResources(path) : listRootResources()
          const text = resources.map(r =>
            `${r.mimeType === 'inode/directory' ? '📁' : '📄'} ${r.uri}\n   ${r.description}`
          ).join('\n')
          return {
            contents: [{
              uri: uri.toString(),
              mimeType: 'text/plain',
              text: `MCP File Browser\n\n${text}`,
            }]
          }
        }

        return await readResource(uri.toString())
      } catch (e: any) {
        return {
          contents: [{
            uri: uri.toString(),
            mimeType: 'text/plain',
            text: `Error: ${e.message}`,
          }]
        }
      }
    }
  )

  return server
}

// ── HTTP server with /mcp endpoint ────────────────────────

async function startServer() {
  printBanner()

  const mcpServer = createMCPServer()

  // LM Studio connects via HTTP POST to /mcp
  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    // CORS headers — needed for LM Studio browser-based requests
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        server: config.server.name,
        version: config.server.version,
        tools: ALL_TOOLS.map(t => t.name),
        allowedPaths: config.security.allowedPaths,
        lmStudioUrl: config.reasoning.lmStudioUrl,
        transport: `http://${config.server.host}:${config.server.port}/mcp`,
      }))
      return
    }

    // MCP endpoint — StreamableHTTP transport
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode for LM Studio
      })

      res.on('close', () => transport.close())
      await transport.handleRequest(req, res)
      await mcpServer.connect(transport)
      return
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found', mcp: '/mcp', health: '/health' }))
  })

  httpServer.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\x1b[31m  Port ${config.server.port} already in use.\x1b[0m`)
      console.error(`  Kill the existing process: lsof -ti:${config.server.port} | xargs kill`)
      process.exit(1)
    }
    throw e
  })

  httpServer.listen(config.server.port, config.server.host, () => {
    console.log(`\x1b[32m  ✓ MCP Server listening on http://${config.server.host}:${config.server.port}/mcp\x1b[0m`)
    console.log()
  })

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n\x1b[90m  Shutting down MCP server…\x1b[0m')
    httpServer.close(() => process.exit(0))
  }
  process.on('SIGINT',  shutdown)
  process.on('SIGTERM', shutdown)
}

startServer().catch(e => {
  console.error('\x1b[31m  Fatal error:\x1b[0m', e.message)
  process.exit(1)
})
