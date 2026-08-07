import { PORTRAIT_MEDIA_QUERY, portraitSiblingPath } from '@/components/helpers/imageHelper'
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

/** Wrap optimized landscape <img> with optional foo-portrait sibling <source>. */
function wrapPortraitPicture (imgTag: string, landscapePathOrUrl: string, w: number | undefined): string {
  const portraitRel = portraitSiblingPath(landscapePathOrUrl)
  if (!portraitRel) return imgTag
  const portraitUrl = buildOptimizedAssetUrl(portraitRel, w)
  if (!portraitUrl) return imgTag
  return `<picture><source media="${PORTRAIT_MEDIA_QUERY}" srcset="${portraitUrl}" />${imgTag}</picture>`
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
      let imgTag: string
      let landscapeForSibling = src
      if (/^https?:\/\//i.test(src) && !src.includes('relaygateway.net')) {
        const mirrored = canonicalSiteAssetToMirrorUrl(src, w)
        if (mirrored) {
          imgTag = `<img${pre} src="${mirrored}"${post}>`
          landscapeForSibling = mirrored
        } else {
          return match
        }
      } else {
        const rel = repoRelativePath(src, basePath)
        const optimized = buildOptimizedAssetUrl(rel, w)
        imgTag = `<img${pre} src="${optimized}"${post}>`
        landscapeForSibling = rel
      }
      return wrapPortraitPicture(imgTag, landscapeForSibling, w)
    },
  )
}
