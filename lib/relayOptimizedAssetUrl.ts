/**
 * Build display URLs for repo assets: primary mirror origin + optional `?w=` for rasters.
 * Relay gateways run `server.hooks.get` + `optimizeRasterFromGetContext` (see SERVER_HOOKS.md).
 */

import { normalizePathForMirror } from '@/lib/canonicalSiteAssetUrl'
import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl, getFilesBaseUrlList } from '@/lib/urlListEnv'
import { getTimelineOrigins } from '@/lib/timelineOrigins'

/** Max thumb width Relay accepts per hook docs (align with gateway). */
const MAX_DISPLAY_W = 8192
export const LQIP_PLACEHOLDER_CAP = 32

export function isRelayOrigin (url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.relaygateway.net')
  } catch {
    return false
  }
}

export function inferAssetRepoFromRelPath (relPath: string): 'files' | 'timeline' {
  const norm = relPath.replace(/^\/+/, '')
  return norm.startsWith('media/') ? 'timeline' : 'files'
}

function clampWidth (w: number): number {
  if (!Number.isFinite(w) || w < 1) return 1
  return Math.min(Math.floor(w), MAX_DISPLAY_W)
}

function encodePathSegments (relPath: string): string {
  const norm = relPath.replace(/^\/+/, '')
  if (!norm) return ''
  return norm
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function primaryBaseForPath (pathForAPI: string): string {
  const clean = pathForAPI.split('?')[0]
  const norm = clean.replace(/^\/+/, '')
  return inferAssetRepoFromRelPath(norm) === 'timeline'
    ? getPrimaryTimelineBaseUrl()
    : getPrimaryFilesBaseUrl()
}

function pathIsSvg (pathForAPI: string): boolean {
  const clean = pathForAPI.split('?')[0]
  const lower = clean.toLowerCase()
  if (lower.endsWith('.svg')) return true
  if (pathForAPI.startsWith('http')) {
    try {
      return new URL(pathForAPI).pathname.toLowerCase().endsWith('.svg')
    } catch {
      return false
    }
  }
  return false
}

/** Set or replace `w` on an absolute URL (preserves other query params). */
function appendWidthQuery (absoluteUrl: string, w: number): string {
  const u = new URL(absoluteUrl)
  u.searchParams.set('w', String(clampWidth(w)))
  return u.toString()
}

function absoluteMirrorUrl (pathForAPI: string): string {
  if (pathForAPI.startsWith('http')) {
    const normalized = normalizePathForMirror(pathForAPI)
    if (!normalized.startsWith('http')) {
      pathForAPI = normalized
    } else {
      return normalized
    }
  } else {
    pathForAPI = normalizePathForMirror(pathForAPI)
  }
  const [clean, ...rest] = pathForAPI.split('?')
  const pathQs = rest.length ? `?${rest.join('?')}` : ''
  const norm = clean.replace(/^\/+/, '')
  const base = primaryBaseForPath(pathForAPI).replace(/\/+$/, '')
  const encodedPath = encodePathSegments(norm)
  return `${base}/${encodedPath}${pathQs}`
}

/**
 * Public URL for raster (WebP from Relay when `?w=` set) or SVG passthrough.
 * `pathForAPI` is repo-relative `/...` or absolute `http(s):`.
 */
export function buildOptimizedAssetUrl (pathForAPI: string, width?: number): string {
  pathForAPI = normalizePathForMirror(pathForAPI)
  const isSvg = pathIsSvg(pathForAPI)
  const absolute = absoluteMirrorUrl(pathForAPI)

  if (isSvg) {
    return absolute.split('?')[0]
  }

  const w = width === undefined ? 800 : clampWidth(width)
  return appendWidthQuery(absolute.split('?')[0], w)
}

export function deriveLqipWidth (displayWidthPx: number): number {
  const d = clampWidth(displayWidthPx)
  return Math.min(LQIP_PLACEHOLDER_CAP, d)
}

/**
 * Tiny placeholder URL when smaller than display width (rasters only). Caller skips if SVG or no shrinking.
 */
export function buildLqipOptimizedAssetUrl (
  pathForAPI: string,
  displayWidthPx: number,
): string | undefined {
  pathForAPI = normalizePathForMirror(pathForAPI)
  if (pathIsSvg(pathForAPI) || pathForAPI.startsWith('http')) return undefined

  const d = clampWidth(displayWidthPx)
  const lqipW = deriveLqipWidth(d)
  if (lqipW >= d) return undefined

  return buildOptimizedAssetUrl(pathForAPI, lqipW)
}

/** All mirror origins for a repo-relative asset (stable hostname order — no shuffle per call). */
export function listOptimizedAssetUrls (pathForAPI: string, width?: number): string[] {
  pathForAPI = normalizePathForMirror(pathForAPI)
  if (pathForAPI.startsWith('http')) {
    return [buildOptimizedAssetUrl(pathForAPI, width)]
  }

  const clean = pathForAPI.split('?')[0]
  const norm = clean.replace(/^\/+/, '')
  const repo = inferAssetRepoFromRelPath(norm)
  const bases = repo === 'timeline' ? getTimelineOrigins() : getFilesBaseUrlList()
  const ordered = [...bases].sort((a, b) => a.localeCompare(b))
  const isSvg = pathIsSvg(pathForAPI)
  const w = width === undefined ? 800 : clampWidth(width)
  return ordered.map((base) => {
    const encodedPath = encodePathSegments(norm)
    const absolute = `${base.replace(/\/+$/, '')}/${encodedPath}`
    if (isSvg) return absolute
    return appendWidthQuery(absolute, w)
  })
}
