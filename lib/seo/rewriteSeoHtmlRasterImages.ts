import { canonicalSiteAssetToMirrorUrl } from '@/lib/canonicalSiteAssetUrl'
import { joinRepoRelativePath } from '@/lib/repoRelativePath'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { parseImageJsonProps } from '@/lib/parseImageJsonProps'

function repoRelativePath (src: string, basePath: string): string {
  const raw = src.trim()
  if (!raw || raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw
  const joined = joinRepoRelativePath(basePath, raw)
  return joined.startsWith('/') ? joined : `/${joined}`
}

function widthFromSrc (src: string): number | undefined {
  const q = src.includes('?') ? src.slice(src.indexOf('?') + 1) : ''
  const w = new URLSearchParams(q).get('w') ?? new URLSearchParams(q).get('width')
  if (!w) return undefined
  const n = parseInt(w, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Rewrite relay `<img>` JSON title props to HTML `class` and optimize raster `src`. */
export function rewriteSeoHtmlRasterImages (html: string, basePath: string): string {
  const withClasses = html.replace(
    /<img([^>]*)\s+title=(['"])(\{[^'"]*\})\2([^>]*)>/gi,
    (match, pre, _q, json, post) => {
      const meta = parseImageJsonProps(json)
      if (!meta.className) return match
      const classAttr = ` class="${meta.className.replace(/"/g, '&quot;')}"`
      return `<img${pre}${classAttr}${post}>`
    },
  )
  return withClasses.replace(
    /<img(\s[^>]*?)\ssrc="([^"]+)"([^>]*)>/gi,
    (match, pre, src, post) => {
      if (!src || src.startsWith('data:')) return match
      const lower = src.split('?')[0].toLowerCase()
      if (lower.endsWith('.svg')) return match
      const w = widthFromSrc(src)
      if (/^https?:\/\//i.test(src) && !src.includes('relaygateway.net')) {
        const mirrored = canonicalSiteAssetToMirrorUrl(src, w)
        if (mirrored) return `<img${pre} src="${mirrored}"${post}>`
        return match
      }
      const rel = repoRelativePath(src, basePath)
      const optimized = buildOptimizedAssetUrl(rel, w)
      return `<img${pre} src="${optimized}"${post}>`
    },
  )
}
