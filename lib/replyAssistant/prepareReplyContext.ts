import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import type { CitationStyle } from '@/lib/replyAssistant/formatCitations'
import type { ReplyTone } from '@/lib/replyAssistant/composeReplyShell'

export type PrepareReplyContextInput = {
  sourceText: string
  maxSeedArticles?: number
  includeCitations?: boolean
  citationStyle?: CitationStyle
  tone?: ReplyTone
  includeBlog?: boolean
}

export type PrepareReplyContextResult = {
  sourceText: string
  extractedQueries: string[]
  seedArticles: Array<{
    path: string
    title: string
    score: number
    matchedTerms: string[]
    canonicalUrl?: string
  }>
  includeCitations: boolean
  citationStyle: CitationStyle
  tone: ReplyTone
  warnings: string[]
  agentInstructions: string
}

const AGENT_WORKFLOW = [
  'Use search_site, expand_search_keywords, and list_index_entries to explore the corpus.',
  'Read only articles you need with read_article (paginate with offset when truncated).',
  'Draft a reply addressing the pasted post in the requested tone.',
  'Do not bulk-fetch the entire index — investigate iteratively.',
].join(' ')

export function prepareReplyContext (
  entries: IndexedPathEntry[],
  input: PrepareReplyContextInput
): PrepareReplyContextResult {
  const includeCitations = input.includeCitations === true
  const citationStyle = input.citationStyle ?? 'footer'
  const tone = input.tone ?? 'conversational'
  const text = input.sourceText?.trim() ?? ''

  if (text.length < 20) {
    return {
      sourceText: text,
      extractedQueries: [],
      seedArticles: [],
      includeCitations,
      citationStyle,
      tone,
      warnings: ['sourceText must be at least 20 characters'],
      agentInstructions: AGENT_WORKFLOW,
    }
  }

  const found = findArticlesForText(entries, {
    sourceText: text,
    maxArticles: Math.min(10, Math.max(1, input.maxSeedArticles ?? 5)),
    includeBlog: input.includeBlog,
    includeCitations,
  })

  const citationNote = includeCitations
    ? `Include citations (${citationStyle} style) with canonical URLs from read_article.`
    : 'Do not include article URLs unless the user explicitly asked for citations.'

  return {
    sourceText: text,
    extractedQueries: found.extractedQueries,
    seedArticles: found.results,
    includeCitations,
    citationStyle,
    tone,
    warnings: found.warnings,
    agentInstructions: `${AGENT_WORKFLOW} ${citationNote} Tone: ${tone}.`,
  }
}
