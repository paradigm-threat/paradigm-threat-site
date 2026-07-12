import type { ContentItem } from './contentTypes'

function blogHref (filename: string): string {
  const stem = filename.replace(/\.md$/i, '')
  return `/blog/${stem}`
}

/**
 * All reader-facing blog roundups from index.json `blog/` node.
 */
export function buildBlogItemsFromIndex (
  blogNode: Record<string, unknown> | null | undefined,
): ContentItem[] {
  if (!blogNode || typeof blogNode !== 'object') return []

  const items: ContentItem[] = []

  for (const [file, data] of Object.entries(blogNode)) {
    if (file.startsWith('_') || file === 'page.md' || !file.endsWith('.md')) continue
    if (file.endsWith('.auto.md')) continue

    const meta = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const updated = typeof meta._updated === 'string' ? meta._updated : ''
    const originalPublishedAt =
      typeof meta._originalPublishedAt === 'string' && meta._originalPublishedAt.trim()
        ? meta._originalPublishedAt.trim()
        : null

    items.push({
      path: `blog/${file}`,
      href: blogHref(file),
      date: originalPublishedAt ?? updated,
      updatedAt: updated,
      originalPublishedAt,
      repo: 'paradigm-threat-files',
      imageSrc: null,
      kind: 'blog',
    })
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return items
}

