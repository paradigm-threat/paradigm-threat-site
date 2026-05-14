import { publicFilesAssetUrl } from '@/lib/canonicalPublicSite'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://paradigmthreat.net'

/** Resolve markdown image/link paths to canonical site URLs for crawlers. */
export function resolveSeoAssetUrl (href: string, basePath: string): string {
  const raw = href.trim()
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return raw
  if (/^https?:\/\//i.test(raw)) return raw

  let path = raw
  const rootAbsolute = path.startsWith('/')
  if (rootAbsolute) path = path.slice(1)
  else if (path.startsWith('./')) path = path.slice(2)

  const prefix = rootAbsolute
    ? ''
    : basePath
      ? (basePath.endsWith('/') ? basePath : `${basePath}/`)
      : ''

  const joined = `${prefix}${path}`.replace(/\/+/g, '/').replace(/^\//, '')
  return publicFilesAssetUrl(joined)
}

export function resolveSeoPageUrl (articlePath: string): string {
  const origin = SITE_URL.replace(/\/$/, '')
  if (!articlePath) return origin
  return `${origin}/${articlePath.replace(/^\/+/, '')}`
}
