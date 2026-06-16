// src/utils/reader.ts
// Universal file reader
// Returns plain text + metadata for all supported formats

import { readFileSync, statSync, existsSync } from 'fs'
import { extname, basename, resolve } from 'path'
import { isPathAllowed, isExtensionAllowed, config } from '../config/index.js'

export interface ReadResult {
  content: string
  metadata: {
    filePath: string
    fileName: string
    fileType: string
    fileSize: number
    charCount: number
    lineCount: number
    modifiedAt: string
    encoding: string
    truncated: boolean
    truncatedAt?: number
  }
}

export class FileReadError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'NOT_ALLOWED' | 'TOO_LARGE' | 'BLOCKED_EXT' | 'PARSE_ERROR' | 'NOT_FILE',
    message: string
  ) {
    super(message)
    this.name = 'FileReadError'
  }
}

// ── Format parsers ────────────────────────────────────────

async function readPDF(path: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const buf = readFileSync(path)
    const data = await pdfParse(buf)
    return data.text
  } catch (e: any) {
    throw new FileReadError('PARSE_ERROR', `PDF parse failed: ${e.message}`)
  }
}

async function readDOCX(path: string): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ path })
    return result.value
  } catch (e: any) {
    throw new FileReadError('PARSE_ERROR', `DOCX parse failed: ${e.message}`)
  }
}

function readText(path: string): string {
  return readFileSync(path, 'utf-8')
}

// ── Main read function ────────────────────────────────────

export async function readFile(filePath: string): Promise<ReadResult> {
  const abs = resolve(filePath)

  // Security checks
  if (!existsSync(abs)) {
    throw new FileReadError('NOT_FOUND', `File not found: ${abs}`)
  }

  const stat = statSync(abs)
  if (!stat.isFile()) {
    throw new FileReadError('NOT_FILE', `Path is not a file: ${abs}`)
  }

  if (!isPathAllowed(abs)) {
    throw new FileReadError(
      'NOT_ALLOWED',
      `Path not in allowlist: ${abs}\n` +
      `Allowed paths: ${config.security.allowedPaths.join(', ')}`
    )
  }

  if (!isExtensionAllowed(abs)) {
    throw new FileReadError('BLOCKED_EXT', `File extension blocked: ${extname(abs)}`)
  }

  if (stat.size > config.security.maxFileSize) {
    throw new FileReadError(
      'TOO_LARGE',
      `File too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB > ` +
      `${(config.security.maxFileSize / 1024 / 1024).toFixed(0)}MB limit`
    )
  }

  // Parse by extension
  const ext = extname(abs).toLowerCase()
  let content: string

  if (ext === '.pdf') {
    content = await readPDF(abs)
  } else if (ext === '.docx' || ext === '.doc') {
    content = await readDOCX(abs)
  } else {
    // Treat as plain text (covers .md, .txt, .ts, .py, .json, .yaml, .csv, etc.)
    content = readText(abs)
  }

  // Truncate if needed
  const maxChars = config.reading.maxCharsPerRead
  const truncated = content.length > maxChars
  const finalContent = truncated ? content.slice(0, maxChars) : content

  return {
    content: finalContent,
    metadata: {
      filePath: abs,
      fileName: basename(abs),
      fileType: ext.replace('.', '') || 'unknown',
      fileSize: stat.size,
      charCount: finalContent.length,
      lineCount: finalContent.split('\n').length,
      modifiedAt: stat.mtime.toISOString(),
      encoding: 'utf-8',
      truncated,
      truncatedAt: truncated ? maxChars : undefined,
    },
  }
}

// ── Snippet extractor ─────────────────────────────────────
// Extract a section of a file around a search term

export function extractSnippet(
  content: string,
  searchTerm: string,
  contextLines: number = 10
): Array<{ lineNumber: number; snippet: string; matchLine: string }> {
  const lines = content.split('\n')
  const results: Array<{ lineNumber: number; snippet: string; matchLine: string }> = []
  const termLower = searchTerm.toLowerCase()

  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(termLower)) {
      const start = Math.max(0, i - contextLines)
      const end = Math.min(lines.length, i + contextLines + 1)
      results.push({
        lineNumber: i + 1,
        matchLine: line.trim(),
        snippet: lines.slice(start, end).map((l, j) => {
          const lineNum = start + j + 1
          const marker = lineNum === i + 1 ? '▶' : ' '
          return `${marker} ${String(lineNum).padStart(4)} │ ${l}`
        }).join('\n'),
      })
    }
  })

  return results
}
