import { codeFrameColumns } from '@babel/code-frame'

export type MarkdownCompileErrorKind =
  | 'unknown_tag'
  | 'malformed_tag'
  | 'unclosed_tag'
  | 'mdx_syntax'
  | 'wasm'
  | 'json'
  | 'runtime'

export interface MarkdownCompileDiagnostics {
  kind: MarkdownCompileErrorKind
  headline: string
  line: number | null
  column: number | null
  codeFrame: string | null
  fullMessage: string
  hint: string | null
}

export class MarkdownCompileError extends Error {
  readonly diagnostics: MarkdownCompileDiagnostics

  constructor (diagnostics: MarkdownCompileDiagnostics) {
    super(diagnostics.headline)
    this.name = 'MarkdownCompileError'
    this.diagnostics = diagnostics
  }
}

const MDX_HINT =
  'This renderer uses md2ast (Markdown + whitelisted HTML/component tags), not MDX. Use `<Component prop="value" />` tags registered in `overrides`, not JSX expressions or `{/* comments */}`.'

const TAG_OPEN_RE = /<([A-Za-z][A-Za-z0-9-]*)([^<>]*?)(\/)?>/g
const TAG_CLOSE_RE = /<\/([A-Za-z][A-Za-z0-9-]*)\s*>/g
const BARE_OPEN_RE = /<([A-Za-z][A-Za-z0-9-]*)\b/g
const ANGLE_AUTOLINK_RE = /<(?:https?:\/\/|mailto:)[^>\s]+>/gi

/** Strip inline code, autolinks, and LaTeX so diagnostics ignore non-HTML uses. */
function lineForTagScan (line: string): string {
  return line
    .replace(ANGLE_AUTOLINK_RE, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\\\([^\\]*\\\)/g, '')
    .replace(/\\\{[^}]*\\\}/g, '')
}

function buildCodeFrame (
  source: string,
  line: number,
  column = 0,
): string | null {
  if (!source || line < 1) return null
  try {
    return codeFrameColumns(
      source,
      { start: { line, column } },
      { linesAbove: 3, linesBelow: 3, highlightCode: false },
    )
  } catch {
    const lines = source.split('\n')
    const idx = line - 1
    if (idx < 0 || idx >= lines.length) return null
    const pad = String(line).length
    const ctx = [
      idx > 0 ? `${String(line - 1).padStart(pad)} | ${lines[idx - 1]}` : null,
      `${String(line).padStart(pad)} | ${lines[idx]}`,
      idx + 1 < lines.length ? `${String(line + 1).padStart(pad)} | ${lines[idx + 1]}` : null,
    ].filter(Boolean)
    return ctx.join('\n')
  }
}

function diag (
  kind: MarkdownCompileErrorKind,
  headline: string,
  source: string,
  line: number | null,
  column: number | null,
  fullMessage: string,
  hint: string | null,
): MarkdownCompileDiagnostics {
  return {
    kind,
    headline,
    line,
    column,
    codeFrame: line != null ? buildCodeFrame(source, line, column ?? 0) : null,
    fullMessage,
    hint,
  }
}

function columnOf (line: string, needle: string): number {
  const i = line.indexOf(needle)
  return i >= 0 ? i : 0
}

/** Scan markdown before WASM parse; throws {@link MarkdownCompileError} on blocking issues. */
export function validateMarkdownSource (
  source: string,
  allowedTags: string[],
): void {
  const allowed = new Set(allowedTags)
  const lines = source.split('\n')
  const openStack: Array<{ tag: string; line: number }> = []
  let inFencedCode = false

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const line = lines[i]

    const fence = line.match(/^(```+|~~~+)/)
    if (fence) {
      inFencedCode = !inFencedCode
      continue
    }
    if (inFencedCode) continue

    const scanLine = lineForTagScan(line)

    if (/\{\s*\/\*/.test(scanLine) || /\/\*\s*\}/.test(scanLine)) {
      throw new MarkdownCompileError(diag(
        'mdx_syntax',
        'JSX block comments `{/* … */}` are not supported in Markdown source',
        source,
        lineNo,
        columnOf(line, '{'),
        `Line ${lineNo}: JSX comment syntax is MDX-only.`,
        MDX_HINT,
      ))
    }

    if (/^\s*import\s+[\w{*]/.test(scanLine) || /^\s*export\s+(default\s+)?(function|const|class)\b/.test(scanLine)) {
      throw new MarkdownCompileError(diag(
        'mdx_syntax',
        'ES module `import` / `export` statements are not supported inside Markdown',
        source,
        lineNo,
        0,
        `Line ${lineNo}: ${line.trim()}`,
        MDX_HINT,
      ))
    }

    if (!/\\\(|\\\[|\\text\{/.test(scanLine)) {
      const braceRe = /\{([^{}]+)\}/g
      let m: RegExpExecArray | null
      while ((m = braceRe.exec(scanLine)) !== null) {
        const idx = m.index ?? 0
        const before = idx > 0 ? scanLine[idx - 1] : ''
        if (before === '_' || before === '\\') continue
        const body = m[1]
        if (body.includes('http')) continue
        if (!/^[a-zA-Z_$]/.test(body.trim())) continue
        throw new MarkdownCompileError(diag(
          'mdx_syntax',
          'Curly-brace JSX expressions `{…}` are not supported — use component tags or plain Markdown',
          source,
          lineNo,
          columnOf(line, '{'),
          `Line ${lineNo}: expression \`{${body}}\``,
          MDX_HINT,
        ))
      }
    }

    let m: RegExpExecArray | null
    TAG_OPEN_RE.lastIndex = 0
    while ((m = TAG_OPEN_RE.exec(scanLine)) !== null) {
      const tag = m[1]
      const selfClose = !!m[3]
      if (!allowed.has(tag)) {
        throw new MarkdownCompileError(diag(
          'unknown_tag',
          `Unknown or disallowed component/tag \`<${tag}>\` — not in renderer overrides`,
          source,
          lineNo,
          m.index,
          `Line ${lineNo}: tag \`${tag}\` is not whitelisted. Register it via MarkdownRenderer \`overrides\` or fix the tag name.`,
          `Allowed custom tags include: ${Array.from(allowed).filter((t) => /^[A-Z]/.test(t)).slice(0, 12).join(', ')}${allowed.size > 12 ? ', …' : ''}.`,
        ))
      }
      if (!selfClose) openStack.push({ tag, line: lineNo })
    }

    TAG_CLOSE_RE.lastIndex = 0
    while ((m = TAG_CLOSE_RE.exec(scanLine)) !== null) {
      const tag = m[1]
      if (!allowed.has(tag)) {
        throw new MarkdownCompileError(diag(
          'unknown_tag',
          `Unknown closing tag \`</${tag}>\``,
          source,
          lineNo,
          m.index,
          `Line ${lineNo}: closing tag \`${tag}\` is not whitelisted.`,
          null,
        ))
      }
      const last = openStack.pop()
      if (!last || last.tag !== tag) {
        throw new MarkdownCompileError(diag(
          'unclosed_tag',
          last
            ? `Mismatched closing tag \`</${tag}>\` — expected \`</${last.tag}>\` (opened line ${last.line})`
            : `Unexpected closing tag \`</${tag}>\` with no matching opener`,
          source,
          lineNo,
          m.index,
          `Line ${lineNo}: \`</${tag}>\``,
          'Ensure each `<Component>…</Component>` pair is balanced, or use self-closing `<Component />`.',
        ))
      }
    }

    const trimmed = scanLine.trimEnd()
    // Multi-line HTML (e.g. <iframe …\n  title=…\n/>) is valid; only flag unclosed PascalCase components.
    if (trimmed.includes('<') && !trimmed.includes('>') && /<[A-Z]/.test(trimmed)) {
      let combined = trimmed
      for (let j = i + 1; j < lines.length && j < i + 16 && !combined.includes('>'); j++) {
        combined += '\n' + lines[j].trimEnd()
      }
      if (combined.includes('>') || combined.includes('/>')) continue
      const bare = trimmed.match(/<([A-Za-z][A-Za-z0-9-]*)\b/)
      throw new MarkdownCompileError(diag(
        'malformed_tag',
        'Unclosed or malformed HTML/component tag on this line',
        source,
        lineNo,
        bare ? columnOf(line, bare[0]) : columnOf(line, '<'),
        `Line ${lineNo}: missing \`>\` in tag.`,
        'Check for truncated tags like `<PopImage src="…"` without `>` or `/>`.',
      ))
    }

    BARE_OPEN_RE.lastIndex = 0
    while ((m = BARE_OPEN_RE.exec(scanLine)) !== null) {
      const tag = m[1]
      const rest = scanLine.slice(m.index)
      if (!rest.includes('>')) continue
      const full = rest.match(/^<[^>]+>/)
      if (!full) {
        throw new MarkdownCompileError(diag(
          'malformed_tag',
          `Malformed tag starting with \`<${tag}\``,
          source,
          lineNo,
          m.index,
          `Line ${lineNo}: could not parse \`${rest.split('\n')[0].slice(0, 80)}\``,
          'Use valid HTML attribute syntax: `name="value"` or boolean attributes.',
        ))
      }
    }
  }

  if (openStack.length > 0) {
    const last = openStack[openStack.length - 1]
    throw new MarkdownCompileError(diag(
      'unclosed_tag',
      `Unclosed tag \`<${last.tag}>\` opened on line ${last.line}`,
      source,
      last.line,
      0,
      `Tag \`${last.tag}\` was opened but never closed before end of document.`,
      'Add a closing tag or use self-closing `<Component />` syntax.',
    ))
  }
}

export function diagnoseMarkdownError (
  error: unknown,
  source: string,
): MarkdownCompileDiagnostics {
  if (error instanceof MarkdownCompileError) {
    return error.diagnostics
  }

  const fullMessage = error instanceof Error ? error.message : String(error)
  const lineCount = source ? source.split('\n').length : 0
  const lineCol = (() => {
    const re = /(?:^|\s|line\s+)(\d{1,6})(?::(\d{1,5}))?\b/gi
    let best: { line: number; column: number | null } | null = null
    let m: RegExpExecArray | null
    while ((m = re.exec(fullMessage)) !== null) {
      const line = parseInt(m[1], 10)
      const column = m[2] != null ? parseInt(m[2], 10) : null
      if (line >= 1 && line <= lineCount + 5) best = { line, column }
    }
    return best
  })()

  const kind: MarkdownCompileErrorKind =
    /wasm|md2ast|instantiate/i.test(fullMessage) ? 'wasm'
      : /json|parse/i.test(fullMessage) ? 'json'
        : 'runtime'

  const headline =
    fullMessage.split('\n').find((l) => l.trim().length > 0)?.trim().slice(0, 400)
    ?? 'Markdown render error'

  return diag(
    kind,
    headline,
    source,
    lineCol?.line ?? null,
    lineCol?.column ?? null,
    fullMessage,
    kind === 'wasm' ? 'Ensure md2ast WASM is built and served at `/wasm/md2ast/`.' : null,
  )
}
