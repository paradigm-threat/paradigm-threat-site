import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { filterIndexedEntriesByQuery, rankIndexedEntriesByPathTokenOverlap } from '@/lib/searchIndexFilter'

/** Common English + repo folder tokens that are poor single-query deep links from a URL slug. */
const NARROW_QUERY_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'new',
  'wiki',
  'page',
  'debunk',
  'science',
  'biology',
])

/**
 * Single token for "Open full search" when multi-token path overlap used OR semantics
 * (AND search page would over-filter on noise like "debunk").
 */
export function suggestedNarrowQueryFromPath(path: string): string {
  const parts = path
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
  const last = parts[parts.length - 1]?.replace(/\.(md|mdx)$/i, '') ?? ''
  const lastTerms = [
    ...new Set(
      last
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 2)
    ),
  ]
  const pick = (candidates: string[]): string => {
    const sorted = [...candidates].sort((a, b) => b.length - a.length)
    const best = sorted.find((t) => !NARROW_QUERY_STOPWORDS.has(t))
    return best ?? sorted[0] ?? ''
  }

  const fromLast = pick(lastTerms)
  if (fromLast) return fromLast

  const all = pathToSearchTerms(path)
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2)
  return pick([...new Set(all)])
}

/**
 * Turn a site path into space-separated search terms (path segments, underscores, hyphens).
 * Ensures at least 2 characters when any slug exists (falls back to last segment).
 */
export function pathToSearchTerms(path: string): string {
  let p = path.trim().replace(/^\/+|\/+$/g, '')
  if (!p) return ''
  p = p.replace(/\.(md|mdx)$/i, '')
  const q = p.replace(/[/._-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length >= 2) return q

  const parts = path.split('/').map((s) => s.trim()).filter(Boolean)
  const last = parts[parts.length - 1]?.replace(/\.(md|mdx)$/i, '') ?? ''
  return last.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Ordered query strings to try when path-derived AND search may be too strict. */
export function searchQueryCandidatesFromPath(path: string): string[] {
  const primary = pathToSearchTerms(path)
  const parts = path.split('/').map((s) => s.trim()).filter(Boolean)
  const out: string[] = []

  const push = (s: string) => {
    const t = s.trim()
    if (t.length >= 2 && !out.includes(t)) out.push(t)
  }

  push(primary)

  const lastRaw = parts[parts.length - 1]?.replace(/\.(md|mdx)$/i, '') ?? ''
  push(lastRaw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim())

  if (parts.length >= 2) {
    const prev = parts[parts.length - 2].replace(/\.(md|mdx)$/i, '')
    push(`${prev} ${lastRaw}`.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim())
  }

  return out
}

export type PathQueryFilterResult = {
  results: IndexedPathEntry[]
  /** Space-separated path tokens used for overlap scoring (OR semantics). */
  queryUsed: string
  /** Query string for `/search` links (AND-safe: usually one distinctive token). */
  linkQuery: string
}

/**
 * Prefer OR overlap on path tokens (ranked by match count descending), then legacy AND candidates.
 */
export function filterEntriesByPathQueries(
  entries: IndexedPathEntry[],
  path: string
): PathQueryFilterResult {
  const tokenStr = pathToSearchTerms(path)
  const pathTokens = tokenStr.split(/\s+/).filter((t) => t.length >= 2)
  const linkBase = suggestedNarrowQueryFromPath(path)

  if (pathTokens.length > 0) {
    const orRanked = rankIndexedEntriesByPathTokenOverlap(entries, pathTokens)
    if (orRanked.length > 0) {
      return {
        results: orRanked,
        queryUsed: [...new Set(pathTokens)].join(' '),
        linkQuery: linkBase || [...new Set(pathTokens)].join(' '),
      }
    }
  }

  const candidates = searchQueryCandidatesFromPath(path)
  for (const q of candidates) {
    const results = filterIndexedEntriesByQuery(entries, q)
    if (results.length > 0) {
      return { results, queryUsed: q, linkQuery: q.includes(' ') ? linkBase || q.split(/\s+/)[0] : q }
    }
  }
  const fallback = candidates[candidates.length - 1] ?? pathToSearchTerms(path)
  return {
    results: filterIndexedEntriesByQuery(entries, fallback),
    queryUsed: fallback,
    linkQuery: linkBase || fallback.split(/\s+/)[0] || fallback,
  }
}

/** Match Search page URL rules for a given query string. */
export function hrefForSearchQuery(val: string): string {
  const v = val.trim()
  if (!v) return '/search'
  if (!v.includes(' ')) return `/search/${encodeURIComponent(v)}`
  return `/search?q=${encodeURIComponent(v)}`
}
