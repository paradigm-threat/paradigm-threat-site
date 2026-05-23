/**
 * Rewrite legacy paradigmthreat.net absolute asset URLs to primary Relay mirrors.
 */

import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'

const RASTER_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico)$/i

/** Map `https://paradigmthreat.net/.../file.png` → relay mirror URL with optional `?w=`. */
export function canonicalSiteAssetToMirrorUrl (
  absoluteUrl: string,
  width?: number,
): string | null {
  const raw = absoluteUrl.trim().split('?')[0]
  if (!raw.startsWith('http')) return null
  let pathname: string
  try {
    const u = new URL(raw)
    if (u.origin !== CANONICAL_SITE_ORIGIN) return null
    pathname = u.pathname
  } catch {
    return null
  }
  if (!RASTER_EXT.test(pathname)) return null
  const rel = pathname.replace(/^\//, '')
  if (!rel) return null
  return buildOptimizedAssetUrl(`/${rel}`, width)
}
