import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import {
  DEFAULT_SEARCH_CONTENT_FILTERS,
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'
import { rankEntriesForSourceText } from '@/lib/replyAssistant/rankForText'

export type FindArticlesForTextInput = {
  sourceText: string
  maxArticles?: number
  includeBlog?: boolean
  includeCitations?: boolean
}

export type FindArticlesForTextResult = {
  extractedQueries: string[]
  results: Array<{
    path: string
    title: string
    score: number
    matchedTerms: string[]
    canonicalUrl?: string
  }>
  warnings: string[]
}

export function findArticlesForText (
  entries: IndexedPathEntry[],
  input: FindArticlesForTextInput
): FindArticlesForTextResult {
  const warnings: string[] = []
  const text = input.sourceText?.trim() ?? ''
  if (text.length < 20) {
    return {
      extractedQueries: [],
      results: [],
      warnings: ['sourceText must be at least 20 characters'],
    }
  }

  const filters: SearchContentFilters = {
    includeBlog: input.includeBlog ?? DEFAULT_SEARCH_CONTENT_FILTERS.includeBlog,
    includeNonArticleMd: DEFAULT_SEARCH_CONTENT_FILTERS.includeNonArticleMd,
  }

  const maxArticles = Math.min(10, Math.max(1, input.maxArticles ?? 5))
  const withUrls = input.includeCitations ? pathToCanonicalUrl : undefined
  const { extractedQueries, results } = rankEntriesForSourceText(
    entries,
    text,
    maxArticles,
    filters,
    withUrls
  )

  if (results.length === 0) {
    warnings.push('low confidence — no index matches for extracted terms')
  } else if (results[0]!.score < 1.5) {
    warnings.push('low confidence — weak term overlap with site index')
  }

  return { extractedQueries, results, warnings }
}
