// src/config/index.ts
// MCP Server configuration
// Security: explicit allowlist of readable paths

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

function readPackageVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export interface MCPConfig {
  server: {
    host: string
    port: number
    name: string
    version: string
  }
  security: {
    // Explicit allowlist — nothing outside these paths can be read
    allowedPaths: string[]
    // Max file size in bytes (default 50MB)
    maxFileSize: number
    // Block these extensions entirely
    blockedExtensions: string[]
    // Require path to be under allowedPaths (never disable)
    enforcePathGuard: boolean
  }
  reading: {
    // Max chars returned per read_file call
    maxCharsPerRead: number
    // Max files returned per list_directory
    maxListEntries: number
    // Follow symlinks (risky — off by default)
    followSymlinks: boolean
  }
  reasoning: {
    // LM Studio local API (OpenAI-compatible)
    lmStudioUrl: string
    model: string
    maxContextTokens: number
    temperature: number
  }
}

// ── Defaults ──────────────────────────────────────────────

function defaultAllowedPaths(): string[] {
  const home = homedir()
  const paths = [
    resolve(home, 'Documents'),
    resolve(home, 'Desktop'),
    resolve(home, 'Downloads'),
    resolve(home, 'Projects'),
  ]
  // Add any from env
  const envPaths = process.env.MCP_ALLOWED_PATHS
  if (envPaths) {
    paths.push(...envPaths.split(':').map(p => resolve(p)))
  }
  return paths.filter(p => existsSync(p))
}

const DEFAULTS: MCPConfig = {
  server: {
    host: process.env.MCP_HOST ?? '127.0.0.1',
    port: parseInt(process.env.MCP_PORT ?? '8080'),
    name: 'lmstudio-mcp-local',
    version: readPackageVersion(),
  },
  security: {
    allowedPaths: defaultAllowedPaths(),
    maxFileSize: parseInt(process.env.MCP_MAX_FILE_SIZE ?? String(50 * 1024 * 1024)),
    blockedExtensions: [
      '.exe', '.dll', '.so', '.dylib', '.bin',
      '.key', '.pem', '.p12', '.pfx',
      '.env', '.secret',
    ],
    enforcePathGuard: true,
  },
  reading: {
    maxCharsPerRead: parseInt(process.env.MCP_MAX_CHARS ?? '200000'),
    maxListEntries: parseInt(process.env.MCP_MAX_LIST ?? '500'),
    followSymlinks: process.env.MCP_FOLLOW_SYMLINKS === 'true',
  },
  reasoning: {
    lmStudioUrl: process.env.LM_STUDIO_URL ?? 'http://127.0.0.1:1234',
    model: process.env.LM_STUDIO_MODEL ?? 'local-model',
    maxContextTokens: parseInt(process.env.LM_CONTEXT_TOKENS ?? '8192'),
    temperature: parseFloat(process.env.LM_TEMPERATURE ?? '0.1'),
  },
}

// ── Load config file override ─────────────────────────────

function loadFile(): Partial<MCPConfig> {
  const paths = [
    resolve('./lmstudio-mcp.json'),
    resolve(homedir(), '.config/lmstudio-mcp/config.json'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try { return JSON.parse(readFileSync(p, 'utf-8')) } catch {}
    }
  }
  return {}
}

function merge<T>(base: T, over: Partial<T>): T {
  const r = { ...base }
  for (const k in over) {
    const v = over[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      r[k] = merge(base[k] as any, v as any)
    } else if (v !== undefined) {
      r[k] = v as any
    }
  }
  return r
}

export const config: MCPConfig = merge(DEFAULTS, loadFile())

// ── Path guard ────────────────────────────────────────────

export function isPathAllowed(filePath: string): boolean {
  if (!config.security.enforcePathGuard) return true
  const abs = resolve(filePath)
  return config.security.allowedPaths.some(allowed => abs.startsWith(allowed))
}

export function isExtensionAllowed(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return !config.security.blockedExtensions.includes(ext)
}

export default config
