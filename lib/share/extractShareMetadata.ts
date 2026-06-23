import { stripMarkdownLite } from '@/lib/share/stripMarkdownLite'
import { stripYamlFrontmatter } from '@/lib/stripYamlFrontmatter'

export interface ShareExtractInput {
  rawMarkdown: string
}

export interface ShareExtractResult {
  /** TL;DR block → else first paragraph */
  snippetPlain: string
  /** Space-separated #tags from `Keywords:` line or `## Keywords` section in body */
  hashtagsLine: string
  /** Plain article body for long platforms (excludes TL;DR block text when possible) */
  articleBodyPlain: string
  /** Same body with paragraph breaks (`\\n\\n`) preserved — used for Facebook modal copy */
  articleBodyParagraphsPlain: string
  /**
   * Substack mirror URL from `**Substack:**` marker or bare substack.com/p/ URL in body.
   */
  substackUrl?: string
}

function stripLeadingH1 (md: string): string {
  return md.replace(/^#\s+.+\n+/, '')
}

function extractKeywordsSectionFromMarkdownBody (md: string): string {
  const lines = md.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const header = lines[i].trim().replace(/\*\*/g, '')
    if (!/^#{1,6}\s+Keywords\s*$/i.test(header)) continue
    const collected: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim()
      if (!t) continue
      if (/^#{1,6}\s+/.test(t) || /^---\s*$/.test(t)) break
      const found = t.match(/#[A-Za-z0-9_]+/g)
      if (found?.length) collected.push(...found)
    }
    if (!collected.length) return ''
    return Array.from(new Set(collected)).join(' ')
  }
  return ''
}

function extractTldrBlock (md: string): string | null {
  const body = stripYamlFrontmatter(md)
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
  const withoutFm = stripYamlFrontmatter(md)
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

function normalizePlainParagraph (text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function markdownToPlainBodySource (md: string): string {
  const noFm = stripYamlFrontmatter(md)
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
  return s.replace(/\n{2,}/g, '\n\n').trim()
}

function markdownToPlainBody (md: string): string {
  return normalizePlainParagraph(markdownToPlainBodySource(md).replace(/\n+/g, ' '))
}

function markdownToPlainBodyParagraphs (md: string): string {
  return markdownToPlainBodySource(md)
    .split(/\n\n+/)
    .map(normalizePlainParagraph)
    .filter(Boolean)
    .join('\n\n')
}

function extractSubstackUrl (rawMarkdown: string): string | undefined {
  const body = stripYamlFrontmatter(rawMarkdown)
  const markerRe =
    /\*\*Substack:\*\*\s*(?:\[[^\]]+\]\((https?:\/\/[^\s)]*substack\.com\/[^\s)]+)\)|<?(https?:\/\/[^\s>]*substack\.com\/[^\s>]+)>?)/i
  const marker = body.match(markerRe)
  if (marker) {
    const found = (marker[1] || marker[2] || '').trim()
    if (found) return found
  }
  const looseRe = /https?:\/\/[^\s)]*substack\.com\/p\/[A-Za-z0-9_\-]+/i
  const loose = body.match(looseRe)
  if (loose) return loose[0].trim()
  return undefined
}

export function extractShareMetadata (input: ShareExtractInput): ShareExtractResult {
  const { rawMarkdown } = input
  const tldr = extractTldrBlock(rawMarkdown)
  const firstPara = extractFirstParagraphPlain(rawMarkdown)
  const snippetPlain = tldr || firstPara || ''
  const fromBody = extractKeywordsLineFromMarkdownBody(rawMarkdown)
  const fromSection = extractKeywordsSectionFromMarkdownBody(rawMarkdown)
  const hashtagsLine = mergeHashtagLines(fromBody, fromSection)
  const articleBodyPlain = markdownToPlainBody(rawMarkdown)
  const articleBodyParagraphsPlain = markdownToPlainBodyParagraphs(rawMarkdown)
  const substackUrl = extractSubstackUrl(rawMarkdown)

  return { snippetPlain, hashtagsLine, articleBodyPlain, articleBodyParagraphsPlain, substackUrl }
}
