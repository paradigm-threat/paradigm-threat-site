/**
 * Build display URLs for repo assets: direct Relay (?w=) when primary mirrors are Relay,
 * else same-origin `/api/image` + sharp (GitLab / preview defaults).
 */

import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'

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

/**
 * Same-origin `/api/image` URL (mirrors + sharp). `path` is the full path/query value the route expects.
 */
export function buildApiImageUrl (pathForAPI: string, width?: number): string {
  let out = `/api/image?path=${encodeURIComponent(pathForAPI)}`
  if (width !== undefined && Number.isFinite(width)) {
    out += `&w=${clampWidth(width)}`
  }
  return out
}

/** Fixed `&w=` once (path may already include query). */
function appendWidthQuery (absoluteUrl: string, w: number): string {
  const u = new URL(absoluteUrl)
  u.searchParams.set('w', String(clampWidth(w)))
  return u.toString()
}

/**
 * Public URL for raster (WebP from Relay or sharp) or SVG passthrough.
 * `pathForAPI` must be repo-relative `/...` or absolute `http(s):` (whitelisted via /api/image).
 */
export function buildOptimizedAssetUrl (pathForAPI: string, width?: number): string {
  const clean = pathForAPI.split('?')[0]
  const lower = clean.toLowerCase()
  const isSvg =
    lower.endsWith('.svg') ||
    (pathForAPI.startsWith('http') &&
      (() => {
        try {
          return new URL(pathForAPI).pathname.toLowerCase().endsWith('.svg')
        } catch {
          return false
        }
      })())

  if (pathForAPI.startsWith('http')) {
    if (isSvg) {
      return buildApiImageUrl(pathForAPI)
    }
    if (width === undefined) {
      return buildApiImageUrl(pathForAPI, 800)
    }
    return buildApiImageUrl(pathForAPI, width)
  }

  const norm = clean.replace(/^\/+/, '')
  const base = primaryBaseForPath(pathForAPI).replace(/\/+$/, '')
  const encodedPath = encodePathSegments(norm)
  const absoluteBase = `${base}/${encodedPath}`

  if (isSvg) {
    if (isRelayOrigin(base)) {
      return absoluteBase
    }
    return buildApiImageUrl(pathForAPI.startsWith('/') ? pathForAPI : `/${norm}`)
  }

  const w =
    width === undefined ? 800 : clampWidth(width)

  if (isRelayOrigin(base)) {
    return appendWidthQuery(absoluteBase, w)
  }

  const pathQs = pathForAPI.includes('?') ? pathForAPI.slice(pathForAPI.indexOf('?')) : ''
  const pathForApi = `/${norm}${pathQs}`
  return buildApiImageUrl(pathForApi, w)
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
  const clean = pathForAPI.split('?')[0]
  const lower = clean.toLowerCase()
  const isSvg = lower.endsWith('.svg')
  if (isSvg || pathForAPI.startsWith('http')) return undefined

  const d = clampWidth(displayWidthPx)
  const lqipW = deriveLqipWidth(d)
  if (lqipW >= d) return undefined

  return buildOptimizedAssetUrl(pathForAPI, lqipW)
}
