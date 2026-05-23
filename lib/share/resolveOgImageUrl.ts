/**
 * OG / share preview image: first markdown image in article body.
 */

import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'
import {
  mirrorRasterOgUrl,
  CANONICAL_SITE_ORIGIN,
  OG_SHARE_IMAGE_WIDTH,
} from '@/lib/canonicalPublicSite'
import { joinRepoRelativePath } from '@/lib/repoRelativePath'
import { isRelayOrigin } from '@/lib/relayOptimizedAssetUrl'

export { OG_SHARE_IMAGE_WIDTH }

const RASTER_IMAGE_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico)$/i

function pathnameOfAbsoluteOrPath (s: string): string {
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      return new URL(s).pathname
    } catch {
      return s
    }
  }
  return s.split('?')[0]
}

function isRasterPathLike (s: string): boolean {
  return RASTER_IMAGE_EXT.test(pathnameOfAbsoluteOrPath(s))
}

function isCanonicalSiteAbsolute (absoluteUrl: string): boolean {
  try {
    return new URL(absoluteUrl).origin === CANONICAL_SITE_ORIGIN
  } catch {
    return false
  }
}

/** Append `?w=` for raster assets on Relay or legacy canonical-site asset paths. */
export function appendOgShareWidthParam (absoluteUrl: string): string {
  const base = absoluteUrl.trim().split('?')[0]
  if (!base.startsWith('http')) return base
  if (!isRasterPathLike(base)) return base

  if (isRelayOrigin(base)) {
    try {
      const u = new URL(base)
      u.searchParams.set('w', String(OG_SHARE_IMAGE_WIDTH))
      return u.toString()
    } catch {
      return base
    }
  }

  if (isCanonicalSiteAbsolute(base)) {
    const rel = relPathFromCanonicalSiteUrl(base)
    if (rel) return mirrorRasterOgUrl(rel)
  }

  return base
}

/** Extract first markdown image URL: ![alt](url) */
export function extractFirstImageUrlFromMarkdown (md: string, basePath: string): string | undefined {
  const match = md.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (!match) return undefined
  const rawSrc = match[1].trim().split('?')[0]
  if (rawSrc.startsWith('http')) {
    return appendOgShareWidthParam(rawSrc)
  }
  const joined = joinRepoRelativePath(basePath, rawSrc)
  return mirrorRasterOgUrl(joined.replace(/^\//, ''))
}

export function resolveOgImageUrl (
  rawContent: string,
  basePath: string,
): string | undefined {
  return extractFirstImageUrlFromMarkdown(rawContent, basePath)
}
