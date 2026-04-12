import { stripMarkdownLite } from '@/lib/share/stripMarkdownLite'

export interface ShareExtractInput {
  rawMarkdown: string
  frontmatter?: Record<string, unknown>
}

export interface ShareExtractResult {
  /** frontmatter description → else TL;DR → else first paragraph */
  snippetPlain: string
  /** Space-separated #tags from frontmatter.keywords and trailing `Keywords:` line in body */
  hashtagsLine: string
  /** Plain article body for long platforms (excludes TL;DR block text when possible) */
  articleBodyPlain: string
}

function stripFrontmatter (md: string): string {
  return md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
}

function stripLeadingH1 (md: string): string {
  return md.replace(/^#\s+.+\n+/, '')
}

/** Blockquote starting with TL;DR (case-insensitive), including continuation lines with `>`. */
function extractTldrBlock (md: string): string | null {
  const body = stripFrontmatter(md)
  const lines = body.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed.startsWith('>')) continue
    const inner = trimmed.replace(/^>\s*/, '')
    if (/^\*\*TL;DR:\*\*/i.test(inner) || /^TL;DR:/i.test(inner)) {
      start = i
      break
    }
  }
  if (start < 0) return null
  const block: string[] = []
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('>')) {
      block.push(trimmed.replace(/^>\s?/, ''))
    } else if (block.length > 0) {
      break
    }
  }
  const joined = block.join('\n')
  const inner = joined.replace(/^\*\*TL;DR:\*\*\s*/i, '').replace(/^TL;DR:\s*/i, '')
  const plain = stripMarkdownLite(inner)
  return plain || null
}

function removeTldrBlockForBody (md: string): string {
  const lines = md.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed.startsWith('>')) continue
    const inner = trimmed.replace(/^>\s*/, '')
    if (/^\*\*TL;DR:\*\*/i.test(inner) || /^TL;DR:/i.test(inner)) {
      start = i
      break
    }
  }
  if (start < 0) return md
  let end = start
  while (end < lines.length) {
    const trimmed = lines[end].trim()
    if (trimmed.startsWith('>')) end++
    else break
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n').trim()
}

function extractFirstParagraphPlain (md: string): string {
  const withoutFm = stripFrontmatter(md)
  const withoutH1 = stripLeadingH1(withoutFm)
  const chunks = withoutH1.split(/\n\s*\n/)
  for (const chunk of chunks) {
    const t = chunk.trim()
    if (!t) continue
    if (t.startsWith('---')) continue
    if (t.startsWith('![')) continue
    if (t.startsWith('#')) continue
    if (/^>\s*\*\*TL;DR:/i.test(t) || /^>\s*TL;DR:/i.test(t)) continue
    if (t.startsWith('>') && /\bTL;DR\b/i.test(t)) continue
    const oneLine = t.replace(/\n/g, ' ')
    return stripMarkdownLite(oneLine)
  }
  return ''
}

function keywordsToHashtagLine (frontmatter: Record<string, unknown> | undefined): string {
  const raw = frontmatter?.keywords
  if (typeof raw !== 'string' || !raw.trim()) return ''
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const tags: string[] = []
  for (const p of parts) {
    const collapsed = p.toLowerCase().replace(/[-\s_]+/g, '').replace(/[^a-z0-9#]/g, '')
    if (!collapsed) continue
    const cleaned = collapsed.replace(/^#+/, '')
    if (!cleaned) continue
    tags.push(`#${cleaned}`)
  }
  return Array.from(new Set(tags)).join(' ')
}

/**
 * Many investigations end with `Keywords: #tag #tag` (see paradigm-threat-files docs/BLOG.md).
 * Scan from the end of the file for a Keywords line and collect #tokens.
 */
function extractKeywordsLineFromMarkdownBody (md: string): string {
  const lines = md.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].replace(/\*\*/g, '').trim()
    const m = line.match(/^Keywords:\s*(.+)$/i)
    if (m) {
      const raw = m[1]
      const found = raw.match(/#[A-Za-z0-9_]+/g)
      if (!found?.length) return ''
      return Array.from(new Set(found)).join(' ')
    }
  }
  return ''
}

function mergeHashtagLines (a: string, b: string): string {
  const tokens = [...a.split(/\s+/), ...b.split(/\s+/)]
    .map((t) => t.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    const norm = t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`
    const key = norm.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(norm)
  }
  return out.join(' ')
}

function removeKeywordsFooter (md: string): string {
  return md.replace(/\n*(?:---\s*\n*)?Keywords:\s+[^\n]+\s*$/im, '').trim()
}

function markdownToPlainBody (md: string): string {
  const noFm = stripFrontmatter(md)
  const noH1 = stripLeadingH1(noFm)
  const noTldr = removeTldrBlockForBody(noH1)
  let s = removeKeywordsFooter(noTldr)
  s = s.replace(/^#{1,6}\s+.+\n+/gm, '\n')
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  s = s.replace(/```[\s\S]*?```/g, ' ')
  s = s.replace(/`([^`]+)`/g, '$1')
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  s = s.replace(/\*([^*]+)\*/g, '$1')
  s = s.replace(/^[-*]\s+/gm, '')
  s = s.replace(/^\d+\.\s+/gm, '')
  s = s.replace(/\n{2,}/g, '\n\n')
  return s.replace(/\s+/g, ' ').trim()
}

export function extractShareMetadata (input: ShareExtractInput): ShareExtractResult {
  const { rawMarkdown, frontmatter = {} } = input
  const desc =
    typeof frontmatter.description === 'string' && frontmatter.description.trim()
      ? stripMarkdownLite(frontmatter.description)
      : ''
  const tldr = extractTldrBlock(stripFrontmatter(rawMarkdown))
  const firstPara = extractFirstParagraphPlain(rawMarkdown)

  const snippetPlain = desc || tldr || firstPara || ''
  const fromFm = keywordsToHashtagLine(frontmatter)
  const fromBody = extractKeywordsLineFromMarkdownBody(rawMarkdown)
  const hashtagsLine = mergeHashtagLines(fromFm, fromBody)
  const articleBodyPlain = markdownToPlainBody(rawMarkdown)

  return { snippetPlain, hashtagsLine, articleBodyPlain }
}
