/**
 * OG / share preview image: frontmatter.image or first markdown image.
 * Mirrors previous articleServer logic (canonical paradigmthreat.net /files/...).
 */

import { publicFilesAssetUrl } from '@/lib/canonicalPublicSite'

/** Extract first markdown image URL: ![alt](url) */
export function extractFirstImageUrlFromMarkdown (md: string, basePath: string): string | undefined {
  const match = md.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (!match) return undefined
  const rawSrc = match[1].trim().split('?')[0]
  if (rawSrc.startsWith('http')) return rawSrc
  const rootAbsolute = rawSrc.startsWith('/')
  let src = rawSrc
  if (rootAbsolute) src = src.slice(1)
  else if (src.startsWith('./')) src = src.slice(2)
  const prefix =
    rootAbsolute ? '' : basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : ''
  const path = (prefix + src).replace(/\/+/g, '/')
  return publicFilesAssetUrl(path.replace(/^\//, ''))
}

export function resolveOgImageUrl (
  rawContent: string,
  basePath: string,
  frontmatter: Record<string, unknown>
): string | undefined {
  if (frontmatter?.image && typeof frontmatter.image === 'string') {
    const img = frontmatter.image as string
    if (img.startsWith('http')) {
      return img
    }
    if (img.startsWith('/')) {
      return publicFilesAssetUrl(img.replace(/^\//, ''))
    }
    const rel = basePath ? `${basePath}/${img.replace(/^\.\//, '')}` : img.replace(/^\.\//, '')
    return publicFilesAssetUrl(rel.replace(/^\//, ''))
  }
  return extractFirstImageUrlFromMarkdown(rawContent, basePath)
}
