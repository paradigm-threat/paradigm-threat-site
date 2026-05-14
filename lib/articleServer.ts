/**
 * Server-side article fetching for SSR/crawling.
 */

import { cache } from 'react'
import { isNonArticlePath } from '@/lib/isNonArticlePath'
import { resolveOgImageUrl } from '@/lib/share/resolveOgImageUrl'
import { fetchFilesTextFromMirrors } from '@/lib/serverFilesMirror'
import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
import { extractFirstHeading, prepareArticleMarkdown } from '@/lib/articleBody'

export interface ArticleData {
  mdxSource: string
  targetPath: string
  title: string
  basePath: string
  /** Absolute URL for OG image, or undefined */
  ogImageUrl?: string
}

export interface TextLeafData {
  text: string
  title: string
  basePath: string
  targetPath: string
}

function titleFromPlainLeafPath (filePath: string): string {
  const seg = filePath.split('/').filter(Boolean).pop() || filePath
  return (
    seg
      .replace(/_/g, ' ')
      .replace(/\.(txt|cs)$/i, '')
      .trim() || 'Document'
  )
}

/** Plain .txt and Relay hook .cs leaves (not MDX). Cached for generateMetadata + page. */
export const fetchTextLeaf = cache(async function fetchTextLeaf (
  path: string,
): Promise<TextLeafData | null> {
  if (!path || (!path.toLowerCase().endsWith('.txt') && !path.toLowerCase().endsWith('.cs'))) return null
  const fileContent = await fetchFilesTextFromMirrors(path, '')
  if (fileContent == null) return null

  const basePath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  return {
    text: fileContent,
    title: titleFromPlainLeafPath(path),
    basePath,
    targetPath: path,
  }
})

export async function fetchArticle (path: string): Promise<ArticleData | null> {
  if (isNonArticlePath(path)) return null

  let targetPath = ''
  let fileContent: string | null = null
  const vParam = ''

  for (const candidate of buildArticleMdCandidatePaths(path)) {
    fileContent = await fetchFilesTextFromMirrors(candidate, vParam)
    if (fileContent) {
      targetPath = candidate
      break
    }
  }

  if (!fileContent) return null

  const mdxSource = prepareArticleMarkdown(fileContent)
  const basePath = targetPath.includes('/')
    ? targetPath.split('/').slice(0, -1).join('/')
    : ''
  const titleFromPath = basePath
    ? basePath.split('/').pop()?.replace(/_/g, ' ')
    : 'Article'
  const title =
    extractFirstHeading(mdxSource) ||
    titleFromPath ||
    'Article'

  const ogImageUrl = resolveOgImageUrl(mdxSource, basePath)

  return {
    mdxSource,
    targetPath,
    title,
    basePath,
    ogImageUrl,
  }
}
