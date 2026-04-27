/**
 * Server-side article fetching for SSR/crawling.
 * Mirrors logic from app/api/article/route.ts.
 */

import { cache } from 'react'
import { isNonArticlePath } from '@/lib/isNonArticlePath'
import { resolveOgImageUrl } from '@/lib/share/resolveOgImageUrl'
import { fetchFilesTextFromMirrors } from '@/lib/serverFilesMirror'

export interface ArticleData {
  mdxSource: string
  targetPath: string
  title: string
  basePath: string
  frontmatter: Record<string, unknown>
  /** Absolute URL for OG image, or undefined */
  ogImageUrl?: string
}

export interface TextLeafData {
  text: string
  title: string
  basePath: string
  targetPath: string
}

function titleFromTextFilePath (filePath: string): string {
  const seg = filePath.split('/').filter(Boolean).pop() || filePath
  return seg.replace(/_/g, ' ').replace(/\.txt$/i, '').trim() || 'Document'
}

/** Plain `.txt` leaves from the files repo (not MDX). Cached for generateMetadata + page. */
export const fetchTextLeaf = cache(async function fetchTextLeaf (
  path: string,
): Promise<TextLeafData | null> {
  if (!path || !path.toLowerCase().endsWith('.txt')) return null
  const fileContent = await fetchFilesTextFromMirrors(path, '')
  if (fileContent == null) return null

  const basePath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  return {
    text: fileContent,
    title: titleFromTextFilePath(path),
    basePath,
    targetPath: path,
  }
})

/** First # heading in body (after frontmatter strip), for OG title when YAML has no title */
function extractFirstHeading (md: string): string | undefined {
  const m = md.match(/^#\s+(.+)$/m)
  return m ? m[1].trim().replace(/\s+#\s*$/, '').trim() : undefined
}

export async function fetchArticle (path: string): Promise<ArticleData | null> {
  if (isNonArticlePath(path)) return null

  let targetPath = ''
  let fileContent: string | null = null
  const vParam = ''

  // 1. Try direct .md/.mdx
  if (path.endsWith('.md') || path.endsWith('.mdx')) {
    fileContent = await fetchFilesTextFromMirrors(path, vParam)
    if (fileContent) targetPath = path
  }

  // 2. Try path.md then path.mdx (extension omitted in URL)
  if (!fileContent && path && !path.endsWith('.md') && !path.endsWith('.mdx')) {
    for (const ext of ['.md', '.mdx']) {
      const p = `${path}${ext}`
      fileContent = await fetchFilesTextFromMirrors(p, vParam)
      if (fileContent) {
        targetPath = p
        break
      }
    }
  }

  // 3. Try page.md then page.mdx (directory index)
  if (!fileContent) {
    const base = path ? `${path}/` : ''
    for (const name of ['page.md', 'page.mdx']) {
      const p = `${base}${name}`
      fileContent = await fetchFilesTextFromMirrors(p, vParam)
      if (fileContent) {
        targetPath = p
        break
      }
    }
  }

  if (!fileContent) return null

  const matter = await import('gray-matter')
  const { content: rawContent, data: frontMatter } = matter.default(fileContent)
  const basePath = targetPath.includes('/')
    ? targetPath.split('/').slice(0, -1).join('/')
    : ''
  const titleFromPath = basePath
    ? basePath.split('/').pop()?.replace(/_/g, ' ')
    : 'Article'
  const title =
    (frontMatter?.title as string) ||
    extractFirstHeading(rawContent) ||
    titleFromPath ||
    'Article'

  // Same autolink transform as API (MDX treats < as JSX)
  const mdxSource = rawContent.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => `[${url}](${url})`)

  const ogImageUrl = resolveOgImageUrl(rawContent, basePath, frontMatter as Record<string, unknown>)

  return {
    mdxSource,
    targetPath,
    title,
    basePath,
    frontmatter: frontMatter as Record<string, unknown>,
    ogImageUrl,
  }
}
