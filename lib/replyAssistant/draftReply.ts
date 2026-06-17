import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import { extractShareMetadata } from '@/lib/share'
import {
  composeReplyShell,
  type ReplyTone,
} from '@/lib/replyAssistant/composeReplyShell'
import type { CitationStyle } from '@/lib/replyAssistant/formatCitations'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import {
  DEFAULT_SEARCH_CONTENT_FILTERS,
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'

export type DraftReplyInput = {
  sourceText: string
  maxArticles?: number
  includeCitations?: boolean
  citationStyle?: CitationStyle
  tone?: ReplyTone
  maxLength?: number
  includeBlog?: boolean
}

export type DraftReplyResult = {
  replyDraft: string
  articlesUsed: Array<{
    path: string
    title: string
    canonicalUrl: string
    tldr: string
  }>
  citationsIncluded: boolean
  extractedQueries: string[]
  warnings: string[]
  /** Structured context for agent-composed replies (Mode A). */
  agentContext: {
    sourceText: string
    articles: Array<{ path: string; title: string; tldr: string; keywords: string }>
  }
}

export type FetchMarkdownFn = (path: string) => Promise<string | null>

export async function draftReplyToText (
  entries: IndexedPathEntry[],
  input: DraftReplyInput,
  fetchMarkdown: FetchMarkdownFn
): Promise<DraftReplyResult> {
  const includeCitations = input.includeCitations === true
  const maxArticles = Math.min(10, Math.max(1, input.maxArticles ?? 3))

  const found = findArticlesForText(entries, {
    sourceText: input.sourceText,
    maxArticles,
    includeBlog: input.includeBlog,
    includeCitations,
  })

  const articlesUsed: DraftReplyResult['articlesUsed'] = []
  const agentArticles: DraftReplyResult['agentContext']['articles'] = []

  for (const hit of found.results) {
    let tldr = ''
    let keywords = ''
    try {
      const md = await fetchMarkdown(hit.path)
      if (md) {
        const meta = extractShareMetadata({ rawMarkdown: md })
        tldr = meta.snippetPlain
        keywords = meta.hashtagsLine
      }
    } catch {
      // continue with title-only
    }

    const title = hit.title || searchEntryTitle({ path: hit.path, searchText: hit.path })
    const canonicalUrl = hit.canonicalUrl ?? pathToCanonicalUrl(hit.path)
    articlesUsed.push({ path: hit.path, title, canonicalUrl, tldr })
    agentArticles.push({ path: hit.path, title, tldr, keywords })
  }

  const citations = includeCitations
    ? articlesUsed.map((a) => ({ title: a.title, url: a.canonicalUrl }))
    : []

  const replyDraft = composeReplyShell({
    sourceText: input.sourceText,
    articles: articlesUsed.map((a) => ({ title: a.title, tldr: a.tldr })),
    tone: input.tone ?? 'conversational',
    includeCitations,
    citations,
    citationStyle: input.citationStyle ?? 'footer',
    maxLength: input.maxLength,
  })

  const warnings = [...found.warnings]
  if (!replyDraft.trim()) {
    warnings.push('no reply draft produced — try a longer paste or different topic')
  }

  return {
    replyDraft,
    articlesUsed,
    citationsIncluded: includeCitations,
    extractedQueries: found.extractedQueries,
    warnings,
    agentContext: {
      sourceText: input.sourceText.trim(),
      articles: agentArticles,
    },
  }
}

export function searchContentFiltersFromInput (input: {
  includeBlog?: boolean
  includeSectionPages?: boolean
}): SearchContentFilters {
  return {
    includeBlog: input.includeBlog ?? DEFAULT_SEARCH_CONTENT_FILTERS.includeBlog,
    includeNonArticleMd: input.includeSectionPages ?? DEFAULT_SEARCH_CONTENT_FILTERS.includeNonArticleMd,
  }
}
