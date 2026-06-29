import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  type SearchContentFilters,
  filterIndexedEntriesByQuery,
} from '@/lib/searchIndexFilter'
import {
  isKeywordExpansionSource,
  isNoiseSearchKeyword,
  searchableTextWithoutPath,
  tokenizeForKeywordExpansion,
} from '@/lib/search/searchKeywordTokens'

/**
 * Co-occurring index tokens among entries matching a query (extended keyword hints).
 */
export function expandSearchKeywords (
  entries: IndexedPathEntry[],
  query: string,
  contentFilters?: SearchContentFilters,
  limit = 12
): { related: string[]; entriesMatched: number } {
  const hits = filterIndexedEntriesByQuery(entries, query, contentFilters)
    .filter((e) => isKeywordExpansionSource(e.path))
  const queryTerms = new Set(
    query.toLowerCase().split(/\s+/).map((t) => t.replace(/[;:,.!?]+$/g, '')).filter((t) => t.length >= 2)
  )

  const freq = new Map<string, number>()
  for (const entry of hits) {
    const content = searchableTextWithoutPath(entry)
    const tokens = tokenizeForKeywordExpansion(content)
    const seen = new Set<string>()
    for (const t of tokens) {
      if (queryTerms.has(t)) continue
      if (seen.has(t)) continue
      seen.add(t)
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }
  }

  const related = Array.from(freq.entries())
    .filter(([t]) => !isNoiseSearchKeyword(t))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([t]) => t)

  return { related, entriesMatched: hits.length }
}
