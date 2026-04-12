/**
 * Server-side article fetching for SSR/crawling.
 * Mirrors logic from app/api/article/route.ts.
 */

import { isNonArticlePath } from '@/lib/isNonArticlePath'
import { publicFilesAssetUrl } from '@/lib/canonicalPublicSite'
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

/** Extract first markdown image URL: ![alt](url) */
function extractFirstImageUrl (md: string, basePath: string): string | undefined {
  const match = md.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (!match) return undefined
  const rawSrc = match[1].trim().split('?')[0]
  if (rawSrc.startsWith('http')) return rawSrc
  // Root-absolute paths (/events/...) are from site root; do not prepend article basePath.
  const rootAbsolute = rawSrc.startsWith('/')
  let src = rawSrc
  if (rootAbsolute) src = src.slice(1)
  else if (src.startsWith('./')) src = src.slice(2)
  const prefix =
    rootAbsolute ? '' : basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : ''
  const path = (prefix + src).replace(/\/+/g, '/')
  return publicFilesAssetUrl(path.replace(/^\//, ''))
}

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

  // OG image: frontmatter.image or first image in content (canonical paradigmthreat.net /files/...)
  let ogImageUrl: string | undefined
  if (frontMatter?.image && typeof frontMatter.image === 'string') {
    const img = frontMatter.image as string
    if (img.startsWith('http')) {
      ogImageUrl = img
    } else if (img.startsWith('/')) {
      ogImageUrl = publicFilesAssetUrl(img.replace(/^\//, ''))
    } else {
      const rel = basePath ? `${basePath}/${img.replace(/^\.\//, '')}` : img.replace(/^\.\//, '')
      ogImageUrl = publicFilesAssetUrl(rel.replace(/^\//, ''))
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
    ogImageUrl,
  }
}
