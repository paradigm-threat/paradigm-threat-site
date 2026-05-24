/**
 * Paths eligible for temporary SSR→files-mirror 307 (see middleware.ts).
 * Site-origin generateMetadata pauses until Relay serves SEO.
 */

const EXCLUDED_PREFIXES = [
  '/_next',
  '/api',
  '/timeline',
  '/chat',
  '/search',
  '/export',
  '/files',
  '/site',
]

const EXCLUDED_EXACT = new Set(['/robots.txt', '/sitemap.xml', '/favicon.ico'])

/** Extensions handled by raster middleware or non-article static leaves. */
const STATIC_ASSET_EXT =
  /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg|pdf|woff2?|ttf|eot|mp4|webm|txt|cs|md|mdx)$/i

export function shouldRedirectPathToFilesMirror (pathname: string): boolean {
  if (!pathname || pathname === '/') return true
  if (EXCLUDED_EXACT.has(pathname)) return false
  for (const prefix of EXCLUDED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return false
  }
  const segment = pathname.split('/').filter(Boolean).pop() || ''
  if (STATIC_ASSET_EXT.test(segment)) return false
  return true
}
