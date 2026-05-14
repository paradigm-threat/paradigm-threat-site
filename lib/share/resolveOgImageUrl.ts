/**
 * OG / share preview image: first markdown image in article body.
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
): string | undefined {
  return extractFirstImageUrlFromMarkdown(rawContent, basePath)
}
