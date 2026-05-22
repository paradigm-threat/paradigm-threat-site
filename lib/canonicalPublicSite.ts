/**
 * Page URLs use the public site origin. Repo asset bytes use primary Relay mirrors from env.
 */

import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'

export const CANONICAL_SITE_ORIGIN = 'https://paradigmthreat.net'

/** Max width for OG / Twitter card rasters on Relay mirrors. */
export const OG_SHARE_IMAGE_WIDTH = 800

function encodePathSegments (relPath: string): string {
  const norm = relPath.replace(/^\/+/, '')
  if (!norm) return ''
  return norm
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

/** paradigm-threat-files asset on primary files mirror (not /files/ on Vercel). */
export function mirrorFilesAssetUrl (relPath: string): string {
  const base = getPrimaryFilesBaseUrl().replace(/\/+$/, '')
  const p = encodePathSegments(relPath)
  return p ? `${base}/${p}` : base
}

/** paradigm-threat-timeline asset on primary timeline mirror (repo root, e.g. media/...). */
export function mirrorTimelineAssetUrl (relPath: string): string {
  const base = getPrimaryTimelineBaseUrl().replace(/\/+$/, '')
  const p = encodePathSegments(relPath)
  return p ? `${base}/${p}` : base
}

/** OG / share raster: primary mirror + `?w=` via Relay hook. */
export function mirrorRasterOgUrl (relPath: string): string {
  const path = relPath.startsWith('/') ? relPath : `/${relPath.replace(/^\/+/, '')}`
  return buildOptimizedAssetUrl(path, OG_SHARE_IMAGE_WIDTH)
}
