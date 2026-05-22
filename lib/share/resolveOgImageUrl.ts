/**
 * OG / share preview image: first markdown image in article body.
 */

import {
  mirrorRasterOgUrl,
  CANONICAL_SITE_ORIGIN,
  OG_SHARE_IMAGE_WIDTH,
} from '@/lib/canonicalPublicSite'
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

/** Repo-relative path from a canonical-site absolute asset URL (strips legacy `/files/` prefix). */
function relPathFromCanonicalAbsolute (absoluteUrl: string): string {
  let pathname = pathnameOfAbsoluteOrPath(absoluteUrl)
  if (pathname.startsWith('/files/timeline/')) {
    return pathname.slice('/files/timeline/'.length)
  }
  if (pathname.startsWith('/files/')) {
    return pathname.slice('/files/'.length)
  }
  return pathname.replace(/^\//, '')
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
    const rel = relPathFromCanonicalAbsolute(base)
    return mirrorRasterOgUrl(rel)
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
  const rootAbsolute = rawSrc.startsWith('/')
  let src = rawSrc
  if (rootAbsolute) src = src.slice(1)
  else if (src.startsWith('./')) src = src.slice(2)
  const prefix =
    rootAbsolute ? '' : basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : ''
  const path = (prefix + src).replace(/\/+/g, '/')
  return mirrorRasterOgUrl(path.replace(/^\//, ''))
}

export function resolveOgImageUrl (
  rawContent: string,
  basePath: string,
): string | undefined {
  return extractFirstImageUrlFromMarkdown(rawContent, basePath)
}
