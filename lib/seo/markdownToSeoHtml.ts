import { normalizeParadigmMarkdown } from '@/lib/normalizeParadigmMarkdown'
import { joinRepoRelativePath } from '@/lib/repoRelativePath'
import { escapeHtml } from '@/lib/seo/escapeHtml'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { resolveSeoAssetUrl } from '@/lib/seo/resolveSeoAssetUrl'
import { stripYamlFrontmatter } from '@/lib/stripYamlFrontmatter'

const CHANGELOG_PLACEHOLDER = '\u0000SEO_CHANGELOG\u0000'

const PASCAL_COMPONENT_RE = /<([A-Z][A-Za-z0-9]*)\s*(\/>|>[\s\S]*?<\/\1>)/g

const SEO_SAFE_HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'cite', 'code', 'del', 'div', 'em', 'figcaption',
  'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'ins', 'li',
  'mark', 'nav', 'ol', 'p', 'pre', 'q', 's', 'section', 'small', 'span', 'strong', 'sub',
  'sup', 'table', 'tbody', 'td', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'video',
])

export interface MarkdownToSeoHtmlOptions {
  basePath: string
  /** Pre-rendered HTML for `<ChangeLog />` replacement. */
  changelogHtml?: string
}

function preprocessCustomComponents (source: string): string {
  let out = source.replace(/<ChangeLog\s*\/>/gi, CHANGELOG_PLACEHOLDER)
  out = out.replace(PASCAL_COMPONENT_RE, (_m, tag: string) => {
    if (tag === 'ChangeLog') return CHANGELOG_PLACEHOLDER
    return ''
  })
  return out
}

function restoreChangelog (html: string, changelogHtml?: string): string {
  const block = changelogHtml ?? '<p><em>Change log</em></p>'
  return html.split(CHANGELOG_PLACEHOLDER).join(block)
}

/** Strip dangerous attributes and tags from inline HTML blocks. */
function sanitizeHtmlBlock (html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function isHtmlBlockStart (line: string): boolean {
  return /^\s*<[a-zA-Z]/.test(line)
}

function collectHtmlBlock (lines: string[], start: number): { html: string; next: number } {
  const buf: string[] = [lines[start]]
  let i = start
  const first = lines[start]
  if (first.includes('>') && (first.includes('/>') || /<\/[a-zA-Z]/.test(first) || !/<[a-zA-Z][^>]*$/.test(first.trim()))) {
    return { html: first, next: start + 1 }
  }
  i++
  while (i < lines.length) {
    buf.push(lines[i])
    const joined = buf.join('\n')
    if (/>/.test(lines[i]) || joined.includes('/>')) break
    i++
  }
  return { html: buf.join('\n'), next: i + 1 }
}

function tagAllowed (html: string): boolean {
  const m = html.match(/<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/)
  if (!m) return false
  return SEO_SAFE_HTML_TAGS.has(m[1].toLowerCase())
}

function seoRasterUrl (src: string, basePath: string): string {
  const raw = src.trim()
  if (!raw || raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw
  const queryParams = new URLSearchParams(raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '')
  const joined = joinRepoRelativePath(basePath, raw.split('?')[0])
  const pathForApi = joined.startsWith('/') ? joined : `/${joined}`
  const wRaw = queryParams.get('w') ?? queryParams.get('width')
  const w = wRaw ? parseInt(wRaw, 10) : undefined
  return buildOptimizedAssetUrl(pathForApi, w)
}

function processInline (text: string, basePath: string): string {
  let out = text
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, src: string) => {
    const url = seoRasterUrl(src, basePath)
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`
  })
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const url = resolveSeoAssetUrl(href, basePath)
    return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, s: string) => `<strong>${escapeHtml(s)}</strong>`)
  out = out.replace(/\*([^*]+)\*/g, (_m, s: string) => `<em>${escapeHtml(s)}</em>`)
  out = out.replace(/`([^`]+)`/g, (_m, s: string) => `<code>${escapeHtml(s)}</code>`)
  return out.split(/(<[^>]+>)/g).map((chunk) => (
    chunk.startsWith('<') ? chunk : escapeHtml(chunk)
  )).join('')
}

function renderParagraph (text: string, basePath: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (isHtmlBlockStart(trimmed) && tagAllowed(trimmed)) {
    return sanitizeHtmlBlock(trimmed)
  }
  return `<p>${processInline(trimmed, basePath)}</p>`
}

function renderBlocks (source: string, basePath: string): string[] {
  const lines = source.split('\n')
  const blocks: string[] = []
  let i = 0

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i++
    if (i >= lines.length) break

    const line = lines[i]

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      blocks.push(`<h${level}>${processInline(heading[2], basePath)}</h${level}>`)
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const inner = quoteLines.map((l) => renderParagraph(l, basePath)).join('\n')
      blocks.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    if (/^(-|\*|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line)
      const tag = ordered ? 'ol' : 'ul'
      const items: string[] = []
      while (i < lines.length && /^(-|\*|\d+\.)\s+/.test(lines[i])) {
        const item = lines[i].replace(/^(-|\*|\d+\.)\s+/, '')
        items.push(`<li>${processInline(item, basePath)}</li>`)
        i++
      }
      blocks.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    if (isHtmlBlockStart(line)) {
      const { html, next } = collectHtmlBlock(lines, i)
      if (tagAllowed(html)) blocks.push(sanitizeHtmlBlock(html))
      i = next
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^#{1,6}\s/) && !/^>\s?/.test(lines[i]) && !/^(-|\*|\d+\.)\s+/.test(lines[i]) && !isHtmlBlockStart(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(renderParagraph(paraLines.join(' '), basePath))
  }

  return blocks.filter(Boolean)
}

/**
 * Server-only markdown → semantic HTML for crawlers (no WASM, no custom React components).
 */
export function markdownToSeoHtml (markdown: string, opts: MarkdownToSeoHtmlOptions): string {
  const prepped = preprocessCustomComponents(normalizeParadigmMarkdown(stripYamlFrontmatter(markdown)))
  const body = renderBlocks(prepped, opts.basePath).join('\n')
  return restoreChangelog(body, opts.changelogHtml)
}
