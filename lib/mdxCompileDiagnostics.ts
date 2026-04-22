/**
 * Normalize MDX / next-mdx-remote compile failures into a stable shape for UI + JSON APIs.
 */
import { codeFrameColumns } from '@babel/code-frame'

export interface MdxCompileDiagnostics {
  /** Short human-readable first line (no code frame noise). */
  headline: string
  /** 1-based source line when known. */
  line: number | null
  column: number | null
  /** Babel-style excerpt of the source around the error. */
  codeFrame: string | null
  /** Full compiler message (includes embedded frame when next-mdx-remote formatted it). */
  fullMessage: string
}

function stripNextMdxWrapper (msg: string): string {
  return msg.replace(/^\[next-mdx-remote\]\s*error compiling MDX:\s*/i, '').trimStart()
}

/**
 * MDX / micromark often embed `line:column` tokens; take the last plausible one.
 */
function parseLineColumnFromText (text: string, maxLine: number): { line: number; column: number } | null {
  const re = /(?:^|\s|\(|>)(\d{1,6}):(\d{1,5})\b/gm
  let best: { line: number; column: number } | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const line = parseInt(m[1], 10)
    const col = parseInt(m[2], 10)
    if (line < 1 || line > maxLine + 5 || col < 0) continue
    best = { line, column: col }
  }
  return best
}

function extractEmbeddedBabelFrame (msg: string): { frame: string; line: number; column: number } | null {
  const lines = msg.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*>\s*\d+\s*\|/.test(lines[i])) {
      start = i
      break
    }
  }
  if (start < 0) return null

  let end = start
  for (; end < lines.length; end++) {
    if (/More information:\s*https:\/\/mdxjs\.com/i.test(lines[end])) {
      end--
      break
    }
  }

  const frameLines: string[] = []
  for (let i = start; i <= end; i++) {
    const line = lines[i]
    if (line.trim() === '' && frameLines.length > 6) break
    frameLines.push(line)
  }

  const frame = frameLines.join('\n').trimEnd()
  const gtMatch = lines[start].match(/^\s*>\s*(\d+)\s*\|/)
  if (!gtMatch) return null
  const line = parseInt(gtMatch[1], 10)

  let column = 0
  if (lines[start + 1]) {
    const caretLine = lines[start + 1]
    const pipeIdx = lines[start].indexOf('|')
    const caretIdx = caretLine.indexOf('^')
    if (pipeIdx >= 0 && caretIdx > pipeIdx) {
      column = caretIdx - pipeIdx - 1
      if (column < 0) column = 0
    }
  }

  return { frame, line, column }
}

function headlineFromMessage (msg: string): string {
  const stripped = stripNextMdxWrapper(msg)
  const lines = stripped.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (/^\d+\s*\|/.test(t)) break
    if (/^\s*>\s*\d+\s*\|/.test(t)) break
    if (/^\s*\|\s*\^/.test(t)) break
    if (/^More information:/i.test(t)) break
    return t.length > 400 ? `${t.slice(0, 397)}…` : t
  }
  return stripped.slice(0, 200).trim() || 'MDX compile error'
}

export function diagnoseMdxCompileError (error: unknown, source: string): MdxCompileDiagnostics {
  const fullMessage = error instanceof Error ? error.message : String(error)
  const headline = headlineFromMessage(fullMessage)
  const lineCount = source ? source.split('\n').length : 0
  const maxLine = Math.max(lineCount, 1)

  const embedded = extractEmbeddedBabelFrame(fullMessage)
  let line: number | null = embedded?.line ?? null
  let column: number | null = embedded != null ? embedded.column : null
  let codeFrame: string | null = embedded?.frame ?? null

  if (line == null) {
    const pos = parseLineColumnFromText(fullMessage, maxLine)
    if (pos) {
      line = pos.line
      column = pos.column
    }
  }

  if ((!codeFrame || codeFrame.length < 8) && source && line != null) {
    try {
      codeFrame = codeFrameColumns(
        source,
        { start: { line, column: column ?? 0 } },
        { linesAbove: 3, linesBelow: 3, highlightCode: false }
      )
    } catch {
      codeFrame = null
    }
  }

  return { headline, line, column, codeFrame, fullMessage }
}
