/**
 * SPA rewrite: article/hub paths → `/` (same shell, client reads pathname).
 * Active only when `NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1` (see next.config.js beforeFiles).
 */

export const SPA_REWRITE_EXCLUDE_PREFIXES = [
  'api',
  '_next',
  'timeline',
  'search',
  'chat',
  'reply',
  'submit',
  'export',
  'files',
  'site',
  'wasm',
] as const

export const SPA_REWRITE_EXCLUDE_EXACT = new Set([
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
  'manifest.json',
  'sw.js',
])

/** Vercel / Next `rewrites` source (path must not be `/` alone). */
export const SPA_REWRITE_SOURCE =
  '/((?!api/|_next/|timeline(?:/|$)|search(?:/|$)|chat(?:/|$)|reply(?:/|$)|submit(?:/|$)|export(?:/|$)|files(?:/|$)|site(?:/|$)|wasm/|robots\\.txt|sitemap\\.xml|favicon\\.ico|manifest\\.json|sw\\.js|swe-worker).*)'

export function shouldSpaRewriteToRoot (pathname: string): boolean {
  if (!pathname || pathname === '/') return false
  const clean = pathname.replace(/^\//, '').replace(/\/$/, '')
  if (!clean) return false
  if (SPA_REWRITE_EXCLUDE_EXACT.has(clean)) return false
  const first = clean.split('/')[0] ?? ''
  if ((SPA_REWRITE_EXCLUDE_PREFIXES as readonly string[]).includes(first)) return false
  if (/\.(js|css|wasm|ico|svg|png|jpe?g|webp|json|txt|xml|woff2?|ttf|map)$/i.test(clean)) {
    return false
  }
  return true
}
