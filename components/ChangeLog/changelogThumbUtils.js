import { canonicalSiteAssetToMirrorUrl } from '@/lib/canonicalSiteAssetUrl'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'

export const PARADIGM_LOGO_SRC = '/site/favicon.svg'

const CHANGELOG_THUMB_IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

/** Root-relative path for same-origin / #img=; pass through external http(s) only. */
export function changelogPublicImageSrc (src) {
  if (!src) return ''
  const s = String(src).trim()
  if (/^https?:\/\//i.test(s)) return s
  const noQuery = s.split('?')[0]
  const withSlash = noQuery.startsWith('/') ? noQuery : `/${noQuery}`
  return withSlash.replace(/\/+/g, '/')
}

/**
 * Changelog strip `<img>` must not use raw `/history/...` on the Next origin (404).
 * Uses primary mirror URL + `?w=` for rasters.
 */
export function changelogThumbSrc (src) {
  const publicSrc = changelogPublicImageSrc(src)
  if (!publicSrc) return ''
  if (publicSrc.startsWith('/site/')) return publicSrc
  if (/^https?:\/\//i.test(publicSrc)) {
    return canonicalSiteAssetToMirrorUrl(publicSrc, 160) ?? publicSrc
  }
  const pathOnly = publicSrc.split('?')[0]
  if (pathOnly.startsWith('/') && CHANGELOG_THUMB_IMAGE_EXT.test(pathOnly)) {
    return buildOptimizedAssetUrl(pathOnly, 160)
  }
  return publicSrc
}

/** Match #img= targets to gallery src (relative or legacy absolute bookmarks). */
export function changelogSrcMatchesHash (resolvedSrc, hashDecoded) {
  if (!hashDecoded || !resolvedSrc) return false
  if (resolvedSrc === hashDecoded) return true
  const r = resolvedSrc.split('?')[0]
  const h = String(hashDecoded).split('?')[0]
  if (r === h) return true

  if (r.startsWith('/') && /^https?:\/\//i.test(h)) {
    try {
      const u = new URL(h)
      const p = u.pathname.replace(/\/+$/, '') || '/'
      const rp = r.replace(/\/+$/, '') || '/'
      return p === rp
    } catch {
      /* fall through */
    }
  }

  try {
    const u1 = new URL(resolvedSrc)
    const u2 = new URL(hashDecoded, typeof window !== 'undefined' ? window.location.origin : 'https://paradigmthreat.net')
    return u1.pathname === u2.pathname && u1.hostname === u2.hostname
  } catch {
    return false
  }
}

export function buildGalleryItemsForEntry (entry) {
  const imgs = Array.isArray(entry.images) ? entry.images.filter((x) => x && x.src) : []
  if (imgs.length === 0) {
    return [{ src: PARADIGM_LOGO_SRC, alt: 'Paradigm Threat' }]
  }
  return imgs.map((im) => ({
    src: changelogPublicImageSrc(im.src),
    alt: im.alt,
  }))
}
