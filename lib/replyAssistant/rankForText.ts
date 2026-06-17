import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  type SearchContentFilters,
  filterIndexedEntriesByQuery,
  rankIndexedEntriesByPathTokenOverlap,
} from '@/lib/searchIndexFilter'
import { extractTermsFromText, extractedSearchQueries } from '@/lib/replyAssistant/extractTerms'

export type RankedArticleHit = {
  path: string
  title: string
  score: number
  matchedTerms: string[]
  canonicalUrl?: string
}

export function entryDisplayTitle (entry: IndexedPathEntry): string {
  const path = entry.path
  const slug = path.replace(/\.(md|mdx)$/i, '').split('/').pop() ?? path
  const fromSlug = slug.replace(/[-_]+/g, ' ').trim()
  const prefix = path + ' '
  if (entry.searchText.startsWith(prefix)) {
    const after = entry.searchText.slice(prefix.length).trim()
    const words = after.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      const candidate = words.slice(0, Math.min(10, words.length)).join(' ')
      if (candidate.length > fromSlug.length) return candidate
    }
  }
  return fromSlug
}

function scoreEntryAgainstTerms (entry: IndexedPathEntry, terms: string[]): { score: number; matched: string[] } {
  const haystack = entry.searchText.toLowerCase()
  const matched: string[] = []
  let score = 0
  for (const term of terms) {
    if (haystack.includes(term)) {
      matched.push(term)
      score += 1 + Math.min(term.length, 12) * 0.05
    }
  }
  return { score, matched }
}

/**
 * Rank index entries for pasted forum text (OR semantics, not AND on full paste).
 */
export function rankEntriesForSourceText (
  entries: IndexedPathEntry[],
  sourceText: string,
  maxArticles: number,
  contentFilters?: SearchContentFilters,
  canonicalUrlFor?: (path: string) => string
): { extractedQueries: string[]; results: RankedArticleHit[] } {
  const terms = extractTermsFromText(sourceText)
  const extractedQueries = extractedSearchQueries(terms)

  const merged = new Map<string, { entry: IndexedPathEntry; score: number; matched: string[] }>()

  const orRanked = rankIndexedEntriesByPathTokenOverlap(entries, terms, contentFilters)
  for (const entry of orRanked) {
    const { score, matched } = scoreEntryAgainstTerms(entry, terms)
    merged.set(entry.path, { entry, score, matched })
  }

  for (const q of extractedQueries) {
    const andHits = filterIndexedEntriesByQuery(entries, q, contentFilters)
    for (const entry of andHits) {
      const prev = merged.get(entry.path)
      const { score, matched } = scoreEntryAgainstTerms(entry, terms)
      const boost = score + q.split(/\s+/).length * 0.5
      if (!prev || boost > prev.score) {
        merged.set(entry.path, { entry, score: boost, matched })
      }
    }
  }

  const results = Array.from(merged.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.entry.path.localeCompare(b.entry.path)
    })
    .slice(0, maxArticles)
    .map(({ entry, score, matched }) => ({
      path: entry.path,
      title: entryDisplayTitle(entry),
      score,
      matchedTerms: matched,
      canonicalUrl: canonicalUrlFor?.(entry.path),
    }))

  return { extractedQueries, results }
}
