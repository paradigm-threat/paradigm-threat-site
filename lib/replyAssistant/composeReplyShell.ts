import { formatCitationBlock, type CitationItem, type CitationStyle } from '@/lib/replyAssistant/formatCitations'

export type ReplyTone = 'neutral' | 'conversational' | 'brief'

export type ReplyArticleContext = {
  title: string
  tldr: string
}

function openingForTone (tone: ReplyTone): string {
  if (tone === 'brief') return ''
  if (tone === 'neutral') return 'A few points that may be relevant:\n\n'
  return 'Thanks for sharing — a few things from our material that might help:\n\n'
}

/**
 * Mode B: rule-based reply frame from article TL;DR excerpts (no server LLM).
 */
export function composeReplyShell (opts: {
  sourceText: string
  articles: ReplyArticleContext[]
  tone?: ReplyTone
  includeCitations?: boolean
  citations?: CitationItem[]
  citationStyle?: CitationStyle
  maxLength?: number
}): string {
  const tone = opts.tone ?? 'conversational'
  const parts: string[] = []

  if (tone !== 'brief') {
    const preview = opts.sourceText.trim().split(/\s+/).slice(0, 24).join(' ')
    if (preview.length >= 20) {
      parts.push(`Re: ${preview}${opts.sourceText.length > preview.length ? '…' : ''}`)
      parts.push('')
    }
  }

  parts.push(openingForTone(tone))

  const articleParts = opts.articles
    .filter((a) => a.tldr?.trim())
    .map((a) => {
      if (tone === 'brief') return `• ${a.tldr.trim()}`
      return `**${a.title}** — ${a.tldr.trim()}`
    })

  if (articleParts.length === 0 && opts.articles.length > 0) {
    for (const a of opts.articles) {
      articleParts.push(tone === 'brief' ? `• See: ${a.title}` : `**${a.title}** — see our article for detail.`)
    }
  }

  parts.push(articleParts.join('\n\n'))

  let text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  if (opts.includeCitations && opts.citations?.length) {
    const block = formatCitationBlock(opts.citations, opts.citationStyle ?? 'footer')
    if (block) text = `${text}\n\n${block}`
  }

  const max = opts.maxLength
  if (max && text.length > max) {
    text = `${text.slice(0, max - 1).trim()}…`
  }

  return text
}
