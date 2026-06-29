import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { expandSearchKeywords } from '@/lib/replyAssistant/expandKeywords'
import { rankEntriesForSourceText } from '@/lib/replyAssistant/rankForText'
import { matchSiteClaims } from '@/lib/siteAi/matchSiteClaims'
import {
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'

export const SUGGESTED_SCORE_THRESHOLD = 1.0
export const MAX_SUGGESTED = 5
export const LOW_RESULTS_THRESHOLD = 3

export function getRelatedKeywords (
  entries: IndexedPathEntry[],
  query: string,
  filters: SearchContentFilters,
  limit = 10,
): string[] {
  const clean = query.trim()
  if (clean.length < 2) return []
  return expandSearchKeywords(entries, clean, filters, limit).related
}

export type LowResultsHints = {
  broadenTerms: string[]
  claimTitles: string[]
  message: string
}

export function getLowResultsHints (
  entries: IndexedPathEntry[],
  query: string,
  filters: SearchContentFilters,
  hitCount: number,
): LowResultsHints | null {
  const clean = query.trim()
  if (clean.length < 2) return null
  if (hitCount >= LOW_RESULTS_THRESHOLD) return null

  const broadenTerms: string[] = []
  const terms = clean.split(/\s+/).filter(Boolean)

  if (terms.length > 1) {
    for (const term of terms) {
      if (term.length < 2) continue
      const { related } = expandSearchKeywords(entries, term, filters, 4)
      for (const r of related) {
        if (!broadenTerms.includes(r)) broadenTerms.push(r)
      }
    }
  } else {
    broadenTerms.push(...getRelatedKeywords(entries, clean, filters, 8))
  }

  const claims = matchSiteClaims(clean, { maxResults: 3 })
  const claimTitles = claims.map((c) => c.title)

  const message = hitCount === 0
    ? 'No exact matches — try broader terms or related topics below.'
    : 'Few matches — try adding related terms or explore suggestions below.'

  return {
    broadenTerms: broadenTerms.slice(0, 8),
    claimTitles,
    message,
  }
}

export type PartitionedArticleHits = {
  primary: IndexedPathEntry[]
  suggested: IndexedPathEntry[]
}

function scoreMapForQuery (
  entries: IndexedPathEntry[],
  query: string,
  filters: SearchContentFilters,
): Map<string, number> {
  const { results } = rankEntriesForSourceText(entries, query, entries.length, filters)
  const scores = new Map<string, number>()
  for (const r of results) scores.set(r.path, r.score)
  return scores
}

/**
 * Re-sort AND hits by relevance score; surface high-scoring alternates in suggested.
 */
export function partitionArticleHits (
  andHits: IndexedPathEntry[],
  allEntries: IndexedPathEntry[],
  query: string,
  filters: SearchContentFilters,
): PartitionedArticleHits {
  const clean = query.trim()
  if (clean.length < 2 || andHits.length === 0) {
    return { primary: andHits, suggested: [] }
  }

  const scores = scoreMapForQuery(allEntries, clean, filters)
  const andPathSet = new Set(andHits.map((e) => e.path))

  const primary = [...andHits].sort((a, b) => {
    const sa = scores.get(a.path) ?? 0
    const sb = scores.get(b.path) ?? 0
    if (sb !== sa) return sb - sa
    return a.path.localeCompare(b.path)
  })

  const orRanked = rankEntriesForSourceText(
    allEntries,
    clean,
    MAX_SUGGESTED + andHits.length,
    filters,
  ).results

  const suggested: IndexedPathEntry[] = []
  const seen = new Set<string>()

  for (const hit of orRanked) {
    if (suggested.length >= MAX_SUGGESTED) break
    if (!andPathSet.has(hit.path)) continue
    if (hit.score < SUGGESTED_SCORE_THRESHOLD) continue
    const entry = andHits.find((e) => e.path === hit.path)
    if (!entry || seen.has(entry.path)) continue
    const primaryIndex = primary.findIndex((e) => e.path === entry.path)
    if (primaryIndex >= 0 && primaryIndex < 3) continue
    seen.add(entry.path)
    suggested.push(entry)
  }

  for (const hit of orRanked) {
    if (suggested.length >= MAX_SUGGESTED) break
    if (andPathSet.has(hit.path)) continue
    if (hit.score < SUGGESTED_SCORE_THRESHOLD) continue
    const entry = allEntries.find((e) => e.path === hit.path)
    if (!entry || seen.has(entry.path)) continue
    seen.add(entry.path)
    suggested.push(entry)
  }

  return { primary, suggested }
}

export function buildSearchFollowUpQuestions (
  query: string,
  relatedKeywords: string[],
): string[] {
  const clean = query.trim()
  if (clean.length < 2) return []

  const out: string[] = []
  const seen = new Set<string>()

  const add = (q: string) => {
    const t = q.trim()
    if (t.length < 8 || seen.has(t.toLowerCase())) return
    seen.add(t.toLowerCase())
    out.push(t)
  }

  const claims = matchSiteClaims(clean, { maxResults: 2 })
  for (const claim of claims) {
    if (claim.demoQuestions?.length) {
      for (const dq of claim.demoQuestions.slice(0, 2)) add(dq)
    }
    add(`How does the site frame "${claim.title}"?`)
    for (const sq of claim.searchQueries.slice(0, 1)) {
      add(`What articles support: ${sq}?`)
    }
  }

  for (const kw of relatedKeywords.slice(0, 3)) {
    add(`How does ${kw} relate to ${clean}?`)
  }

  add(`What investigations cover ${clean}?`)
  add(`Summarize the strongest site arguments about ${clean}.`)

  return out.slice(0, 6)
}
