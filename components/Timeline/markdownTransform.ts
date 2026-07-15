/**
 * Transforms standalone markdown images into PopImage components.
 * Handles: ![alt](url) -> <PopImage src="url" alt="alt" />
 *
 * Caption convention: an image line immediately followed by a non-blank line
 * (no blank line between) is treated as image + caption and rendered as a
 * semantic <figure>/<figcaption> block:
 *
 *   ![alt](url)
 *   *Caption text with [links](url) and *italic* spans.*
 *   →
 *   <PopImage src="url" alt="Caption text (plain)">caption line</PopImage>
 *
 * When a caption is present, the caption markdown is passed as children to
 * PopImage (rendered inside the image border). The alt attribute uses the
 * plain-text version of the caption for accessibility.
 *
 * Tailwind's `prose` styles render figcaption as small, italic, muted text.
 * No default classes; use JSON-in-title for per-image styling: ![alt](url?w=360 '{"className":"..."}').
 *
 * Pandoc-style attributes after the closing `)` are also supported (timeline book convention):
 *   ![alt](url){.book-illustration}
 *   → className="book-illustration" on PopImage (the `{...}` is not left as visible text).
 */

import { parseImageJsonProps } from '@/lib/parseImageJsonProps'
import { normalizeParadigmMarkdown } from '@/lib/md2ast-react/normalizeParadigmMarkdown'

/**
 * Parse `{.class1 .class2 #id}` after a markdown image (Pandoc / Kramdown style).
 */
export function parsePandocImageAttrBlock (block: string | undefined): { className?: string; id?: string } {
  if (typeof block !== 'string') return {}
  const trimmed = block.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {}
  const inner = trimmed.slice(1, -1).trim()
  if (!inner) return {}
  const classes: string[] = []
  let id: string | undefined
  for (const raw of inner.split(/\s+/)) {
    const t = raw.trim()
    if (!t) continue
    if (t.startsWith('#')) id = t.slice(1)
    else if (t.startsWith('.')) classes.push(t.slice(1))
  }
  const out: { className?: string; id?: string } = {}
  if (id) out.id = id
  if (classes.length) out.className = classes.join(' ')
  return out
}

function escapeJsxAttrValue (s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function extraAttrsFromImageParts (jsonQuoted: string | undefined, pandocBlock: string | undefined): string {
  const jsonMeta = parseImageJsonProps(jsonQuoted)
  const pandoc = parsePandocImageAttrBlock(pandocBlock)
  const merged: Record<string, string> = { ...jsonMeta }
  if (pandoc.className) {
    merged.className = merged.className
      ? `${merged.className} ${pandoc.className}`
      : pandoc.className
  }
  if (pandoc.id) merged.id = pandoc.id
  const parts: string[] = []
  if (merged.id) parts.push(`id="${escapeJsxAttrValue(merged.id)}"`)
  if (merged.className) parts.push(`className="${escapeJsxAttrValue(merged.className)}"`)
  return parts.length ? ' ' + parts.join(' ') : ''
}

/**
 * Strip markdown formatting to produce plain text (for alt attributes).
 * Handles: *italic*, **bold**, [text](url), `code`.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')            // *italic* → italic
    .replace(/`([^`]+)`/g, '$1')              // `code` → code
    .trim()
}

/**
 * Transform markdown images (optionally followed by a caption line) to
 * PopImage / figure+figcaption components.
 *
 * When a caption is present, the caption text (stripped of markdown) is used
 * as the alt attribute instead of the original alt text from ![alt](...).
 */
export function transformImageCaptions (md: string): string {
  if (typeof md !== 'string') return ''
  const normalized = normalizeParadigmMarkdown(md)

  // Optional Pandoc attribute block after `)`; must be consumed so it is not rendered as plain text.
  const pandocAttrs = '(\\{[^}]+\\})?'
  // Only horizontal space between `)` and `{...}` — NOT \\s* (newlines), or `)\\n\\n![` is misread as
  // image + caption and the next image line becomes junk inside <PopImage>, leaving raw tags as text.
  const afterUrlSpace = '[ \\t]*'

  const jsonTitle = "(?:\\s+'(\\{[^']*\\})'|\\s+\"(\\{[^\"]*\\})\")?"

  const imagePattern = new RegExp(
    '!\\[([^\\]]*)\\]\\(([^)\\s]+)' + jsonTitle + '\\)' + afterUrlSpace + pandocAttrs,
    'g'
  )

  const imageWithCaption = new RegExp(
    '!\\[([^\\]]*)\\]\\(([^)\\s]+)' + jsonTitle + '\\)' + afterUrlSpace + pandocAttrs + '\\n([^\\n]+(?:\\n[^\\n]+)*)',
    'g'
  )

  let result = normalized.replace(imageWithCaption, (match, _alt, url, jsonSingle, jsonDouble, attrs, caption) => {
    const captionPlain = escapeJsxAttrValue(stripMarkdown(caption))
    const safeUrl = typeof url === 'string' ? url : ''
    const extra = extraAttrsFromImageParts(jsonSingle || jsonDouble, attrs)
    return `<PopImage src="${safeUrl}" alt="${captionPlain}"${extra}>${caption}</PopImage>`
  })

  result = result.replace(imagePattern, (match, alt, url, jsonSingle, jsonDouble, attrs) => {
    const safeAlt = escapeJsxAttrValue(typeof alt === 'string' ? alt : '')
    const safeUrl = typeof url === 'string' ? url : ''
    const extra = extraAttrsFromImageParts(jsonSingle || jsonDouble, attrs)
    return `<PopImage src="${safeUrl}" alt="${safeAlt}"${extra} />`
  })

  return result
}
