import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  filterIndexedEntriesByQuery,
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'
import { rankSearchEntries, scoreSearchEntry } from '@/lib/search/searchRankScore'

/**
 * Shared keyword search for `/search`, WebMCP `search_site`, and Site AI tool bridge.
 * AND filter → title/slug-aware rank (descending).
 */
export function filterAndRankSearchEntries (
  entries: IndexedPathEntry[],
  query: string,
  filters?: SearchContentFilters,
  limit?: number,
): IndexedPathEntry[] {
  const hits = filterIndexedEntriesByQuery(entries, query, filters)
  const ranked = rankSearchEntries(hits, query)
  if (limit !== undefined && limit > 0) return ranked.slice(0, limit)
  return ranked
}

export function searchHitScores (
  entries: IndexedPathEntry[],
  query: string,
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const entry of entries) {
    scores.set(entry.path, scoreSearchEntry(entry, query))
  }
  return scores
}
