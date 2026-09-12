/**
 * Canonical http(s) href for dead-URL maps.
 * Must match `@relay/path.normalizeHttpHref` / files `scripts/lib/dead-urls.mjs`.
 *
 * Trim; non-http(s) returned unchanged. Lowercase scheme + host. Drop `#fragment`.
 * Drop default ports `:80` / `:443`. Drop a trailing `/` on the path except
 * origin-only `https://host/`. Keep query. Do not rewrite `http`↔`https` or strip
 * `www`. Parse failure → original string.
 */
export function normalizeHttpHref (href: unknown): string {
  if (typeof href !== 'string') return ''
  const trimmed = href.trim()
  if (trimmed.length === 0) return ''
  const lower = trimmed.toLowerCase()
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return trimmed
  try {
    const u = new URL(trimmed)
    const scheme = u.protocol.toLowerCase()
    const host = u.hostname.toLowerCase()
    let port = u.port
    if ((scheme === 'http:' && port === '80') || (scheme === 'https:' && port === '443')) {
      port = ''
    }
    let path = u.pathname || '/'
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    const origin = port ? `${scheme}//${host}:${port}` : `${scheme}//${host}`
    if (path === '/' && u.search === '') return `${origin}/`
    return `${origin}${path}${u.search}`
  } catch {
    return trimmed
  }
}

export type DeadUrlEntry = {
  status?: number
  reason?: string
  firstConfirmed?: string
  lastChecked?: string
}

export type DeadUrlMap = Record<string, DeadUrlEntry>

/** Exact key, then normalize. Missing/non-object map → null (must not throw). */
export function lookupHttpHref (map: unknown, href: string): DeadUrlEntry | null {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null
  const rec = map as Record<string, unknown>
  const exact = rec[href]
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) {
    return exact as DeadUrlEntry
  }
  const n = normalizeHttpHref(href)
  const v = rec[n]
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as DeadUrlEntry
  }
  return null
}

export function parseDeadUrlMap (text: string | null | undefined): DeadUrlMap {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return {}
  try {
    const obj = JSON.parse(text) as unknown
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
    return obj as DeadUrlMap
  } catch {
    return {}
  }
}
