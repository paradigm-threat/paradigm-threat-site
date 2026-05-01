import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

/** Same AND semantics as `/search`: every whitespace-separated term must appear in searchText (lowercased). */
export function filterIndexedEntriesByQuery(
  entries: IndexedPathEntry[],
  query: string
): IndexedPathEntry[] {
  if (!entries || !Array.isArray(entries)) return []
  const cleanQuery = query.trim().toLowerCase()
  if (cleanQuery.length < 2) return []

  const searchTerms = cleanQuery.split(/\s+/).filter(Boolean)
  return entries.filter((entry) => {
    if (!entry || typeof entry.path !== 'string') return false
    if (entry.path.includes('.auto.md')) return false
    const haystack = entry.searchText.toLowerCase()
    return searchTerms.every((term) => haystack.includes(term))
  })
}

/**
 * Path-token suggestions: an entry matches if **any** token appears in `searchText` (or path).
 * Results are sorted by **descending** number of distinct tokens matched, then path for stability.
 */
export function rankIndexedEntriesByPathTokenOverlap(
  entries: IndexedPathEntry[],
  pathTokens: string[]
): IndexedPathEntry[] {
  if (!entries?.length || !pathTokens.length) return []

  const terms = [...new Set(pathTokens.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2))]
  if (terms.length === 0) return []

  const scored: { entry: IndexedPathEntry; score: number }[] = []
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') continue
    if (entry.path.includes('.auto.md')) continue
    const haystack = entry.searchText.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (haystack.includes(term)) score++
    }
    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.entry.path.localeCompare(b.entry.path)
  })
  return scored.map((s) => s.entry)
}
