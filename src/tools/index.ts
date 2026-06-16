// src/tools/index.ts
// MCP Tool definitions
// These are the capabilities exposed to LM Studio

import { readdirSync, statSync, existsSync } from 'fs'
import { resolve, join, basename, extname } from 'path'
import { readFile, extractSnippet, FileReadError } from '../utils/reader.js'
import { isPathAllowed, config } from '../config/index.js'
import { glob } from 'glob'

// ── Tool result helpers ───────────────────────────────────

function ok(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  }
}

function err(msg: string) {
  return {
    content: [{ type: 'text' as const, text: `ERROR: ${msg}` }],
    isError: true,
  }
}

function fmt(obj: unknown) {
  return JSON.stringify(obj, null, 2)
}

// ════════════════════════════════════════════════════════════
// TOOL: read_file
// Read a single local file and return its content
// ════════════════════════════════════════════════════════════

export const READ_FILE_TOOL = {
  name: 'read_file',
  description:
    'Read a local file and return its full content. ' +
    'Supports PDF, DOCX, Markdown, plain text, source code, JSON, YAML, CSV. ' +
    'Use this to load documents before reasoning over them.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file. Example: /Users/me/Documents/report.pdf',
      },
      start_line: {
        type: 'number',
        description: 'Optional: start reading from this line number (1-indexed)',
      },
      end_line: {
        type: 'number',
        description: 'Optional: stop reading at this line number (inclusive)',
      },
    },
    required: ['path'],
  },
}

export async function handleReadFile(args: { path: string; start_line?: number; end_line?: number }) {
  try {
    const result = await readFile(args.path)
    let content = result.content

    // Line range slicing
    if (args.start_line !== undefined || args.end_line !== undefined) {
      const lines = content.split('\n')
      const start = Math.max(0, (args.start_line ?? 1) - 1)
      const end = args.end_line !== undefined ? args.end_line : lines.length
      content = lines.slice(start, end).join('\n')
    }

    const meta = result.metadata
    const header = [
      `FILE: ${meta.filePath}`,
      `TYPE: ${meta.fileType.toUpperCase()} | SIZE: ${(meta.fileSize / 1024).toFixed(1)}KB | LINES: ${meta.lineCount} | MODIFIED: ${meta.modifiedAt}`,
      meta.truncated ? `⚠ TRUNCATED at ${meta.truncatedAt} chars — use start_line/end_line for more` : '',
      '─'.repeat(60),
      '',
    ].filter(Boolean).join('\n')

    return ok(header + content)
  } catch (e: any) {
    if (e instanceof FileReadError) {
      return err(`[${e.code}] ${e.message}`)
    }
    return err(e.message)
  }
}

// ════════════════════════════════════════════════════════════
// TOOL: list_directory
// List files and subdirectories at a path
// ════════════════════════════════════════════════════════════

export const LIST_DIRECTORY_TOOL = {
  name: 'list_directory',
  description:
    'List files and subdirectories at a given path. ' +
    'Returns file names, types, sizes, and modified dates. ' +
    'Use this to explore the file system before deciding which files to read.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list. Example: /Users/me/Documents',
      },
      recursive: {
        type: 'boolean',
        description: 'Recurse into subdirectories (default: false)',
      },
      filter: {
        type: 'string',
        description: 'Filter by extension. Example: "pdf" or "md,txt"',
      },
      show_hidden: {
        type: 'boolean',
        description: 'Include hidden files starting with "." (default: false)',
      },
    },
    required: ['path'],
  },
}

export async function handleListDirectory(args: {
  path: string
  recursive?: boolean
  filter?: string
  show_hidden?: boolean
}) {
  const abs = resolve(args.path)

  if (!existsSync(abs)) return err(`Directory not found: ${abs}`)
  if (!isPathAllowed(abs)) return err(`Path not in allowlist: ${abs}\nAllowed: ${config.security.allowedPaths.join(', ')}`)

  const stat = statSync(abs)
  if (!stat.isDirectory()) return err(`Not a directory: ${abs}`)

  const filterExts = args.filter
    ? args.filter.split(',').map(e => '.' + e.trim().replace(/^\./, ''))
    : null

  try {
    type Entry = {
      name: string; path: string; type: 'file' | 'directory'
      size?: number; ext?: string; modified?: string
    }

    const entries: Entry[] = []

    if (args.recursive) {
      const pattern = filterExts
        ? `${abs}/**/*.{${filterExts.map(e => e.slice(1)).join(',')}}`
        : `${abs}/**/*`
      const files = await glob(pattern, {
        dot: args.show_hidden ?? false,
        nodir: false,
        maxDepth: 8,
      })
      for (const f of files.slice(0, config.reading.maxListEntries)) {
        try {
          const s = statSync(f)
          entries.push({
            name: basename(f),
            path: f,
            type: s.isDirectory() ? 'directory' : 'file',
            size: s.isFile() ? s.size : undefined,
            ext: s.isFile() ? extname(f).slice(1) : undefined,
            modified: s.mtime.toISOString().slice(0, 19).replace('T', ' '),
          })
        } catch { /* skip */ }
      }
    } else {
      const names = readdirSync(abs)
      for (const name of names.slice(0, config.reading.maxListEntries)) {
        if (!args.show_hidden && name.startsWith('.')) continue
        const full = join(abs, name)
        try {
          const s = statSync(full)
          const ext = extname(name).toLowerCase()
          if (filterExts && s.isFile() && !filterExts.includes(ext)) continue
          entries.push({
            name,
            path: full,
            type: s.isDirectory() ? 'directory' : 'file',
            size: s.isFile() ? s.size : undefined,
            ext: s.isFile() ? ext.slice(1) : undefined,
            modified: s.mtime.toISOString().slice(0, 19).replace('T', ' '),
          })
        } catch { /* skip */ }
      }
    }

    // Sort: directories first, then files alphabetically
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const dirs = entries.filter(e => e.type === 'directory')
    const files = entries.filter(e => e.type === 'file')

    const lines = [
      `DIRECTORY: ${abs}`,
      `${dirs.length} subdirectories, ${files.length} files`,
      '─'.repeat(60),
      '',
      ...dirs.map(d => `  📁  ${d.name}/`),
      dirs.length > 0 ? '' : '',
      ...files.map(f =>
        `  📄  ${f.name.padEnd(40)} ${String(f.ext ?? '').padEnd(6)} ${
          f.size !== undefined ? ((f.size / 1024).toFixed(1) + 'KB').padStart(10) : ''
        }  ${f.modified ?? ''}`
      ),
    ]

    return ok(lines.join('\n'))
  } catch (e: any) {
    return err(e.message)
  }
}

// ════════════════════════════════════════════════════════════
// TOOL: search_in_file
// Find occurrences of a term in a file with surrounding context
// ════════════════════════════════════════════════════════════

export const SEARCH_IN_FILE_TOOL = {
  name: 'search_in_file',
  description:
    'Search for a term or phrase within a file and return matching lines with surrounding context. ' +
    'Useful for quickly locating specific information in large documents without reading everything.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'File path to search in',
      },
      query: {
        type: 'string',
        description: 'Search term or phrase (case-insensitive)',
      },
      context_lines: {
        type: 'number',
        description: 'Number of lines to show before and after each match (default: 5)',
      },
      max_matches: {
        type: 'number',
        description: 'Maximum number of matches to return (default: 10)',
      },
    },
    required: ['path', 'query'],
  },
}

export async function handleSearchInFile(args: {
  path: string
  query: string
  context_lines?: number
  max_matches?: number
}) {
  try {
    const result = await readFile(args.path)
    const matches = extractSnippet(result.content, args.query, args.context_lines ?? 5)
    const limited = matches.slice(0, args.max_matches ?? 10)

    if (limited.length === 0) {
      return ok(`No matches found for "${args.query}" in ${args.path}`)
    }

    const out = [
      `SEARCH: "${args.query}" in ${result.metadata.fileName}`,
      `Found ${matches.length} match(es)${matches.length > limited.length ? ` (showing first ${limited.length})` : ''}`,
      '─'.repeat(60),
      '',
      ...limited.map((m, i) =>
        `[Match ${i + 1} — Line ${m.lineNumber}]\n${m.snippet}\n`
      ),
    ]
    return ok(out.join('\n'))
  } catch (e: any) {
    if (e instanceof FileReadError) return err(`[${e.code}] ${e.message}`)
    return err(e.message)
  }
}

// ════════════════════════════════════════════════════════════
// TOOL: read_multiple_files
// Read several files at once — returns combined context
// ════════════════════════════════════════════════════════════

export const READ_MULTIPLE_TOOL = {
  name: 'read_multiple_files',
  description:
    'Read multiple files at once and return their combined content. ' +
    'Ideal for comparing documents, summarising a set of files, or loading related files together. ' +
    'Each file is clearly separated with headers.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of file paths to read',
        maxItems: 10,
      },
      summary_only: {
        type: 'boolean',
        description: 'Return only the first 500 chars per file for a quick overview (default: false)',
      },
    },
    required: ['paths'],
  },
}

export async function handleReadMultiple(args: { paths: string[]; summary_only?: boolean }) {
  const results: string[] = []
  const errors: string[] = []

  for (const p of args.paths.slice(0, 10)) {
    try {
      const r = await readFile(p)
      const content = args.summary_only
        ? r.content.slice(0, 500) + (r.content.length > 500 ? '\n[… truncated for overview]' : '')
        : r.content
      results.push(
        `${'═'.repeat(60)}\nFILE: ${r.metadata.filePath}\n${
          `TYPE: ${r.metadata.fileType} | SIZE: ${(r.metadata.fileSize / 1024).toFixed(1)}KB`
        }\n${'─'.repeat(60)}\n${content}\n`
      )
    } catch (e: any) {
      errors.push(`${p}: ${e.message}`)
    }
  }

  const header = [
    `READ ${results.length} FILE(S)${errors.length ? `, ${errors.length} ERROR(S)` : ''}`,
    errors.length > 0 ? `\nERRORS:\n${errors.map(e => '  • ' + e).join('\n')}\n` : '',
  ].filter(Boolean).join('\n')

  return ok(header + '\n' + results.join('\n'))
}

// ════════════════════════════════════════════════════════════
// TOOL: find_files
// Glob search across allowed paths
// ════════════════════════════════════════════════════════════

export const FIND_FILES_TOOL = {
  name: 'find_files',
  description:
    'Search for files matching a pattern across the allowed paths. ' +
    'Use this to locate files by name, extension, or glob pattern before reading them.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'File name or glob pattern. Examples: "*.pdf", "report*", "**/*.md"',
      },
      search_path: {
        type: 'string',
        description: 'Directory to search in (defaults to all allowed paths)',
      },
      max_results: {
        type: 'number',
        description: 'Maximum results to return (default: 50)',
      },
    },
    required: ['pattern'],
  },
}

export async function handleFindFiles(args: {
  pattern: string
  search_path?: string
  max_results?: number
}) {
  const maxResults = args.max_results ?? 50
  const searchRoots = args.search_path
    ? [resolve(args.search_path)]
    : config.security.allowedPaths

  const allMatches: string[] = []

  for (const root of searchRoots) {
    if (!existsSync(root) || !isPathAllowed(root)) continue
    const pattern = `${root}/**/${args.pattern}`
    try {
      const matches = await glob(pattern, { dot: false, nodir: false, maxDepth: 10 })
      allMatches.push(...matches)
    } catch { /* skip */ }
    if (allMatches.length >= maxResults) break
  }

  const limited = allMatches.slice(0, maxResults)
  if (limited.length === 0) {
    return ok(`No files found matching "${args.pattern}"`)
  }

  const lines = [
    `FOUND ${limited.length} FILE(S) matching "${args.pattern}"${allMatches.length > maxResults ? ` (showing first ${maxResults})` : ''}`,
    '─'.repeat(60),
    '',
    ...limited.map(p => {
      try {
        const s = statSync(p)
        return `  ${p}  ${s.isDirectory() ? '[DIR]' : `${(s.size / 1024).toFixed(1)}KB`}`
      } catch {
        return `  ${p}`
      }
    }),
  ]

  return ok(lines.join('\n'))
}

// ════════════════════════════════════════════════════════════
// TOOL: reason_over_file
// Read a file + ask LM Studio to reason about it
// This keeps the full reasoning loop inside MCP
// ════════════════════════════════════════════════════════════

export const REASON_OVER_FILE_TOOL = {
  name: 'reason_over_file',
  description:
    'Read one or more local files and perform AI reasoning over their content using the local LM Studio model. ' +
    'Use this for: summarisation, question answering, comparison, extraction, code review, translation. ' +
    'All processing stays local — nothing leaves the machine.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'File path(s) to read and reason over',
        maxItems: 5,
      },
      instruction: {
        type: 'string',
        description:
          'What to do with the file content. Examples: ' +
          '"Summarise the key points", ' +
          '"Extract all action items", ' +
          '"Compare these two documents", ' +
          '"Review this code for bugs", ' +
          '"Translate to English"',
      },
      output_format: {
        type: 'string',
        enum: ['prose', 'bullet_points', 'json', 'markdown', 'table'],
        description: 'Desired output format (default: prose)',
      },
      max_tokens: {
        type: 'number',
        description: 'Maximum tokens for the reasoning response (default: 2048)',
      },
    },
    required: ['paths', 'instruction'],
  },
}

export async function handleReasonOverFile(args: {
  paths: string[]
  instruction: string
  output_format?: string
  max_tokens?: number
}) {
  // Step 1: Read all files
  const fileContents: string[] = []
  const readErrors: string[] = []

  for (const p of args.paths.slice(0, 5)) {
    try {
      const r = await readFile(p)
      fileContents.push(
        `### FILE: ${r.metadata.fileName}\n` +
        `(${r.metadata.fileType.toUpperCase()}, ${(r.metadata.fileSize / 1024).toFixed(1)}KB)\n\n` +
        r.content
      )
    } catch (e: any) {
      readErrors.push(`${p}: ${e.message}`)
    }
  }

  if (fileContents.length === 0) {
    return err(`Could not read any files.\n${readErrors.join('\n')}`)
  }

  // Step 2: Build prompt
  const formatInstructions: Record<string, string> = {
    prose: 'Respond in clear, well-structured prose.',
    bullet_points: 'Respond as a concise bullet-point list.',
    json: 'Respond ONLY with valid JSON, no other text.',
    markdown: 'Respond in Markdown with headers, lists, and formatting as appropriate.',
    table: 'Respond as a Markdown table where possible.',
  }
  const formatHint = formatInstructions[args.output_format ?? 'prose'] ?? ''

  const systemPrompt =
    'You are a precise document analysis assistant. ' +
    'You have been given local file content to analyse. ' +
    'Base your response entirely on the provided content. ' +
    'Do not hallucinate information not present in the files. ' +
    (formatHint ? formatHint : '')

  const userPrompt =
    `DOCUMENT CONTENT:\n\n${fileContents.join('\n\n---\n\n')}\n\n` +
    `---\n\nINSTRUCTION: ${args.instruction}`

  // Step 3: Call LM Studio
  try {
    const res = await fetch(`${config.reasoning.lmStudioUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.reasoning.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.reasoning.temperature,
        max_tokens: args.max_tokens ?? 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return err(`LM Studio API error ${res.status}: ${errBody}`)
    }

    const data = await res.json() as any
    const answer = data.choices?.[0]?.message?.content ?? ''
    const usage = data.usage ?? {}

    const footer = [
      '',
      '─'.repeat(60),
      `Model: ${data.model ?? config.reasoning.model}`,
      `Tokens: ${usage.prompt_tokens ?? '?'} prompt + ${usage.completion_tokens ?? '?'} completion`,
      `Files processed: ${fileContents.length}${readErrors.length > 0 ? `, ${readErrors.length} failed` : ''}`,
      readErrors.length > 0 ? `Read errors: ${readErrors.join('; ')}` : '',
    ].filter(Boolean).join('\n')

    return ok(answer + footer)

  } catch (e: any) {
    if (e.name === 'TimeoutError') {
      return err('LM Studio request timed out (120s). Try a shorter document or simpler instruction.')
    }
    return err(
      `Cannot reach LM Studio at ${config.reasoning.lmStudioUrl}.\n` +
      `Make sure LM Studio is running with a model loaded.\n` +
      `Error: ${e.message}`
    )
  }
}

// ════════════════════════════════════════════════════════════
// TOOL: get_file_info
// Metadata only — no content — for quick inspection
// ════════════════════════════════════════════════════════════

export const GET_FILE_INFO_TOOL = {
  name: 'get_file_info',
  description: 'Get metadata about a file without reading its content. Returns size, type, dates, and line count.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'File path' },
    },
    required: ['path'],
  },
}

export async function handleGetFileInfo(args: { path: string }) {
  const abs = resolve(args.path)
  if (!existsSync(abs)) return err(`Not found: ${abs}`)
  if (!isPathAllowed(abs)) return err(`Path not in allowlist: ${abs}`)

  try {
    const s = statSync(abs)
    const info = {
      path: abs,
      name: basename(abs),
      type: s.isDirectory() ? 'directory' : extname(abs).slice(1) || 'unknown',
      isDirectory: s.isDirectory(),
      sizeBytes: s.size,
      sizeKB: parseFloat((s.size / 1024).toFixed(2)),
      sizeMB: parseFloat((s.size / 1024 / 1024).toFixed(3)),
      created: s.birthtime.toISOString(),
      modified: s.mtime.toISOString(),
      readable: true,
      withinSizeLimit: s.size <= config.security.maxFileSize,
    }
    return ok(fmt(info))
  } catch (e: any) {
    return err(e.message)
  }
}

// ── Tool registry ─────────────────────────────────────────

export const ALL_TOOLS = [
  READ_FILE_TOOL,
  LIST_DIRECTORY_TOOL,
  SEARCH_IN_FILE_TOOL,
  READ_MULTIPLE_TOOL,
  FIND_FILES_TOOL,
  REASON_OVER_FILE_TOOL,
  GET_FILE_INFO_TOOL,
]

export async function dispatchTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'read_file':            return handleReadFile(args as any)
    case 'list_directory':       return handleListDirectory(args as any)
    case 'search_in_file':       return handleSearchInFile(args as any)
    case 'read_multiple_files':  return handleReadMultiple(args as any)
    case 'find_files':           return handleFindFiles(args as any)
    case 'reason_over_file':     return handleReasonOverFile(args as any)
    case 'get_file_info':        return handleGetFileInfo(args as any)
    default:
      return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }], isError: true }
  }
}
