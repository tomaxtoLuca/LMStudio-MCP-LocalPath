// src/resources/index.ts
// MCP Resources — expose allowed file system paths
// LM Studio can browse these like a file picker

import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { config, isPathAllowed } from '../config/index.js'
import { readFile } from '../utils/reader.js'
import { lookup as mimeLookup } from 'mime-types'

// ── Build resource URI from path ──────────────────────────

export function pathToUri(filePath: string): string {
  return `file://${filePath}`
}

export function uriToPath(uri: string): string {
  return uri.replace(/^file:\/\//, '')
}

// ── List top-level resources (allowed directories) ────────

export function listRootResources() {
  return config.security.allowedPaths
    .filter(p => existsSync(p))
    .map(p => ({
      uri: pathToUri(p),
      name: basename(p),
      description: `Local directory: ${p}`,
      mimeType: 'inode/directory',
    }))
}

// ── List resources within a directory ─────────────────────

export function listDirResources(dirPath: string) {
  if (!existsSync(dirPath)) return []
  if (!isPathAllowed(dirPath)) return []

  try {
    const entries = readdirSync(dirPath)
    return entries
      .filter(name => !name.startsWith('.'))
      .slice(0, config.reading.maxListEntries)
      .map(name => {
        const full = join(dirPath, name)
        try {
          const s = statSync(full)
          const isDir = s.isDirectory()
          const mime = isDir ? 'inode/directory' : (mimeLookup(name) || 'text/plain')
          return {
            uri: pathToUri(full),
            name,
            description: isDir
              ? `Directory: ${full}`
              : `${(s.size / 1024).toFixed(1)}KB · ${new Date(s.mtime).toLocaleDateString()}`,
            mimeType: mime as string,
          }
        } catch { return null }
      })
      .filter(Boolean) as Array<{ uri: string; name: string; description: string; mimeType: string }>
  } catch {
    return []
  }
}

// ── Read resource content ──────────────────────────────────

export async function readResource(uri: string) {
  const filePath = uriToPath(uri)

  if (!isPathAllowed(filePath)) {
    throw new Error(`Resource not in allowlist: ${filePath}`)
  }

  if (!existsSync(filePath)) {
    throw new Error(`Resource not found: ${filePath}`)
  }

  const stat = statSync(filePath)
  if (stat.isDirectory()) {
    // Return directory listing as text
    const resources = listDirResources(filePath)
    const text = resources.map(r => `${r.mimeType === 'inode/directory' ? '📁' : '📄'} ${r.uri}  ${r.description}`).join('\n')
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: `Directory: ${filePath}\n\n${text}`,
      }],
    }
  }

  // File
  const result = await readFile(filePath)
  const mimeType = mimeLookup(filePath) || 'text/plain'

  return {
    contents: [{
      uri,
      mimeType: mimeType as string,
      text: result.content,
    }],
  }
}
