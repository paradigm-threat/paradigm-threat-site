/**
 * Search URL <-> query string sync without Next.js router navigation.
 *
 * Supported formats:
 * - /search
 * - /search/<slug>           (single token style)
 * - /search?q=<multi word>  (multi token style)
 */

/** Pure helper for building the canonical search URL for a query string. */
export function searchPathForQuery(query: string): string {
  const val = query.trim()
  if (!val) return '/search'
  if (!val.includes(' ')) return `/search/${encodeURIComponent(val)}`
  return `/search?q=${encodeURIComponent(val)}`
}

export function readSearchQueryFromLocation(): string {
  if (typeof window === 'undefined') return ''

  const { pathname, search } = window.location

  // Prefer pathname-based query (existing deep-link format).
  if (pathname === '/search') {
    const params = new URLSearchParams(search)
    return params.get('q') ?? ''
  }

  if (pathname.startsWith('/search/')) {
    const rest = pathname.slice('/search/'.length)
    const firstSegment = rest.split('/').filter(Boolean)[0] ?? ''
    if (firstSegment) return decodeURIComponent(firstSegment)
  }

  // Fallback to query string
  const params = new URLSearchParams(search)
  return params.get('q') ?? ''
}

export function syncSearchUrl(query: string) {
  if (typeof window === 'undefined') return

  const next = searchPathForQuery(query)
  const current = window.location.pathname + window.location.search
  if (current === next) return

  window.history.replaceState(null, '', next)
}

export function subscribeToSearchUrlPopstate(onQueryChange: (q: string) => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => onQueryChange(readSearchQueryFromLocation())
  window.addEventListener('popstate', handler)
  return () => window.removeEventListener('popstate', handler)
}

