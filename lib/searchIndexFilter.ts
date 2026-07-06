import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { REPLY_STOPWORDS } from '@/lib/replyAssistant/stopwords'

export type SearchContentFilters = {
  /** When false, paths under `blog/` are hidden from search results. */
  includeBlog: boolean
  /** When false, section index files (`page.md`, `index.md`) are hidden. */
  includeNonArticleMd: boolean
}

export const DEFAULT_SEARCH_CONTENT_FILTERS: SearchContentFilters = {
  includeBlog: false,
  includeNonArticleMd: false,
}

export function isBlogSearchPath(path: string): boolean {
  return path === 'blog' || path.startsWith('blog/')
}

/** Section landing / index markdown — not standalone articles. */
export function isNonArticleMdPath(path: string): boolean {
  if (!/\.(md|mdx)$/i.test(path)) return false
  return /(^|\/)(page|index)\.(md|mdx)$/i.test(path)
}

export function isExcludedBySearchContentFilters(
  path: string,
  filters: SearchContentFilters | undefined
): boolean {
  if (!filters) return false
  if (!filters.includeBlog && isBlogSearchPath(path)) return true
  if (!filters.includeNonArticleMd && isNonArticleMdPath(path)) return true
  return false
}

/** Whether a query token matches indexed text (incl. 911 ↔ 9/11 aliases). */
export function searchTermMatchesHaystack(term: string, haystack: string): boolean {
  const t = term.toLowerCase()
  const h = haystack.toLowerCase()
  if (h.includes(t)) return true
  if (t === '911' || t === '9-11') return h.includes('9/11')
  if (t === '9/11') return h.includes('911') || h.includes('9/11')
  return false
}

/** AND terms for keyword search; drops stopwords when the query has other tokens. */
export function queryTermsForAndFilter (cleanQuery: string): string[] {
  const raw = cleanQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const meaningful = raw.filter((t) => !REPLY_STOPWORDS.has(t))
  return meaningful.length > 0 ? meaningful : raw
}

/** Same AND semantics as `/search`: every term must appear in searchText (lowercased). */
export function filterIndexedEntriesByQuery(
  entries: IndexedPathEntry[],
  query: string,
  contentFilters?: SearchContentFilters
): IndexedPathEntry[] {
  if (!entries || !Array.isArray(entries)) return []
  const cleanQuery = query.trim().toLowerCase()
  if (cleanQuery.length < 2) return []

  const searchTerms = queryTermsForAndFilter(cleanQuery)
  return entries.filter((entry) => {
    if (!entry || typeof entry.path !== 'string') return false
    if (entry.path.includes('.auto.md')) return false
    if (isExcludedBySearchContentFilters(entry.path, contentFilters)) return false
    const haystack = entry.searchText
    return searchTerms.every((term) => searchTermMatchesHaystack(term, haystack))
  })
}

/**
 * Path-token suggestions: an entry matches if **any** token appears in `searchText` (or path).
 * Results are sorted by **descending** number of distinct tokens matched, then path for stability.
 */
export function rankIndexedEntriesByPathTokenOverlap(
  entries: IndexedPathEntry[],
  pathTokens: string[],
  contentFilters?: SearchContentFilters
): IndexedPathEntry[] {
  if (!entries?.length || !pathTokens.length) return []

  const terms = Array.from(new Set(pathTokens.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2)))
  if (terms.length === 0) return []

  const scored: { entry: IndexedPathEntry; score: number }[] = []
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') continue
    if (entry.path.includes('.auto.md')) continue
    if (isExcludedBySearchContentFilters(entry.path, contentFilters)) continue
    const haystack = entry.searchText
    let score = 0
    for (const term of terms) {
      if (searchTermMatchesHaystack(term, haystack)) score++
    }
    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.entry.path.localeCompare(b.entry.path)
  })
  return scored.map((s) => s.entry)
}
