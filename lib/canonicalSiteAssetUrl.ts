/**
 * Rewrite legacy paradigmthreat.net absolute asset URLs to primary Relay mirrors.
 */

import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'

const RASTER_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico)$/i

/** Repo-relative path from a canonical-site URL or root-relative path (strips legacy `/files/`). */
export function relPathFromCanonicalSiteUrl (absoluteOrPath: string): string | null {
  const raw = absoluteOrPath.trim()
  if (!raw) return null

  let pathname: string
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw.split('?')[0])
      if (u.origin !== CANONICAL_SITE_ORIGIN) return null
      pathname = u.pathname
    } catch {
      return null
    }
  } else {
    pathname = raw.split('?')[0]
    if (!pathname.startsWith('/')) pathname = `/${pathname}`
  }

  if (pathname.startsWith('/files/timeline/')) {
    return pathname.slice('/files/timeline/'.length)
  }
  if (pathname.startsWith('/files/')) {
    return pathname.slice('/files/'.length)
  }
  const rel = pathname.replace(/^\/+/, '')
  return rel || null
}

/**
 * Normalize markdown or mirror input: canonical-site absolute → repo-relative `/…`;
 * external `http(s)` unchanged.
 */
export function normalizePathForMirror (pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const rel = relPathFromCanonicalSiteUrl(trimmed)
    return rel ? `/${rel}` : trimmed
  }
  const rel = relPathFromCanonicalSiteUrl(trimmed)
  if (rel && trimmed.replace(/^\//, '') !== rel) {
    return `/${rel}`
  }
  return trimmed
}

/** Map `https://paradigmthreat.net/.../file.png` → relay mirror URL with optional `?w=`. */
export function canonicalSiteAssetToMirrorUrl (
  absoluteUrl: string,
  width?: number,
): string | null {
  const rel = relPathFromCanonicalSiteUrl(absoluteUrl)
  if (!rel || !RASTER_EXT.test(rel)) return null
  return buildOptimizedAssetUrl(`/${rel}`, width)
}
