/**
 * Shared helpers for /export reverse proxy (timeline export paths).
 */

export const ASSET_PROXY_HEADER_ALLOW = new Set([
  'content-type',
  'content-disposition',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
])

export function filterUpstreamHeaders (upstream: Headers): Headers {
  const out = new Headers()
  upstream.forEach((value, key) => {
    const k = key.toLowerCase()
    if (ASSET_PROXY_HEADER_ALLOW.has(k)) {
      out.set(key, value)
    }
  })
  return out
}

export function assertSafePathSegments (segments: string[]): string | null {
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..' || seg.includes('/') || seg.includes('\\')) {
      return 'Invalid path'
    }
  }
  return null
}

/** Build `/a/b/c` from URL segments (already decoded by Next). */
export function pathFromSegments (segments: string[]): string {
  if (!segments.length) return ''
  return '/' + segments.map((s) => encodeURIComponent(s)).join('/')
}

export function applyDefaultCache (headers: Headers): void {
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
  }
}
