// src/mcp-server.ts
// Shared MCP server factory (tools + resources)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { existsSync, statSync } from 'fs'
import { config } from './config/index.js'
import { ALL_TOOLS, dispatchTool } from './tools/index.js'
import { listRootResources, listDirResources, readResource, uriToPath } from './resources/index.js'

function debugLog(message: string) {
  if (process.env.MCP_DEBUG === 'true') {
    console.error(message)
  }
}

export function createMCPServer() {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  })

  for (const tool of ALL_TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.zodShape,
      async (args: Record<string, any>) => {
        const start = Date.now()
        const result = await dispatchTool(tool.name, args)
        const ms = Date.now() - start
        const failed = 'isError' in result && result.isError
        debugLog(`  [tool] ${tool.name} → ${ms}ms ${failed ? '❌' : '✓'}`)
        return result
      }
    )
  }

  server.resource(
    'local-files',
    'file:///',
    async (uri: URL) => {
      try {
        const filePath = uriToPath(uri.toString())
        const isDir = existsSync(filePath) && statSync(filePath).isDirectory()

        if (!existsSync(filePath) || isDir) {
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
