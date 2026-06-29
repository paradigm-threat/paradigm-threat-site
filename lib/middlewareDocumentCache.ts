/** Paths excluded from CDN document caching (middleware + vercel.json). */
export const EDGE_NO_CACHE_PREFIXES = [
  '/api/',
  '/_next/',
  '/chat',
  '/search',
  '/timeline',
  '/reply',
  '/export',
  '/site/',
] as const

export function shouldCacheDocumentPath (pathname: string): boolean {
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/favicon.ico') {
    return false
  }
  return !EDGE_NO_CACHE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}
