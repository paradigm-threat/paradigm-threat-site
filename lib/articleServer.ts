/**
 * Server-side article fetching for SSR/crawling.
 * Mirrors logic from app/api/article/route.ts.
 */

import { isNonArticlePath } from '@/lib/isNonArticlePath'
import { prepareArticleMarkdown, resolveArticleDisplayTitle } from '@/lib/articleBody'
import { fetchFilesRepoMarkdown } from '@/lib/fetchFilesRepoMarkdown'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

const FILES_BASE_URL = getPrimaryFilesBaseUrl()

export interface ArticleData {
  mdxSource: string
  targetPath: string
  title: string
  basePath: string
  frontmatter: Record<string, unknown>
  /** Absolute URL for OG image, or undefined */
  ogImageUrl?: string
}

/** Extract first markdown image URL: ![alt](url) */
function extractFirstImageUrl(md: string, basePath: string): string | undefined {
  const match = md.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (!match) return undefined
  let src = match[1].trim().split('?')[0]
  if (src.startsWith('http')) return src
  if (src.startsWith('/')) src = src.slice(1)
  else if (src.startsWith('./')) src = src.slice(2)
  const prefix = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : ''
  const path = (prefix + src).replace(/\/+/g, '/')
  const base = getPrimaryFilesBaseUrl()
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export async function fetchArticle(path: string): Promise<ArticleData | null> {
  if (isNonArticlePath(path)) return null

  const fetched = await fetchFilesRepoMarkdown(path)
  if (!fetched) return null

  const { text: fileContent, relPath: targetPath } = fetched

  const matter = await import('gray-matter')
  const { content: rawContent, data: frontMatter } = matter.default(fileContent)
  const basePath = targetPath.includes('/')
    ? targetPath.split('/').slice(0, -1).join('/')
    : ''
  const mdxSource = prepareArticleMarkdown(rawContent)
  const title = resolveArticleDisplayTitle(
    targetPath,
    mdxSource,
    frontMatter?.title as string | undefined
  )

  // Same autolink transform as API (MDX treats < as JSX) — already applied in prepareArticleMarkdown for angle URLs
  // OG image: frontmatter.image or first image in content
  const filesBase = getPrimaryFilesBaseUrl()
  let ogImageUrl: string | undefined
  if (frontMatter?.image && typeof frontMatter.image === 'string') {
    const img = frontMatter.image as string
    if (img.startsWith('http')) {
      ogImageUrl = img
    } else if (img.startsWith('/')) {
      ogImageUrl = `${filesBase}${img}`
    } else {
      const rel = basePath ? `${basePath}/${img.replace(/^\.\//, '')}` : img.replace(/^\.\//, '')
      ogImageUrl = `${filesBase}/${rel}`.replace(/\/+/g, '/')
    }
  } else {
    ogImageUrl = extractFirstImageUrl(rawContent, basePath)
  }

  return {
    mdxSource,
    targetPath,
    title,
    basePath,
    frontmatter: frontMatter as Record<string, unknown>,
    ogImageUrl
  }
}

export interface TextLeafData {
  title: string
  text: string
}

/** Plain .txt or hooks .cs leaves from the files mirror. */
export async function fetchTextLeaf (path: string): Promise<TextLeafData | null> {
  if (!path || path === '/') return null
  const segment = path.split('/').filter(Boolean).pop() || ''
  if (!/\.(txt|cs)$/i.test(segment)) return null

  const res = await fetch(`${FILES_BASE_URL}/${path}`, { cache: 'no-store' })
  if (!res.ok) return null
  const text = await res.text()
  const baseName = segment.replace(/\.(txt|cs)$/i, '')
  const title = baseName.replace(/_/g, ' ') || 'Document'
  return { title, text }
}
