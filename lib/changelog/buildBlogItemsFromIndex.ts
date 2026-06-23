import type { ContentItem } from './buildContentItemsFromChangelog'

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

    items.push({
      path: `blog/${file}`,
      href: blogHref(file),
      date: updated,
      repo: 'paradigm-threat-files',
      imageSrc: null,
      kind: 'blog',
    })
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return items
}

/**
 * Index lists every blog post; changelog adds commit dates and hero images when present.
 */
export function mergeBlogTabItems (
  fromIndex: ContentItem[],
  fromChangelog: ContentItem[],
): ContentItem[] {
  const byPath = new Map<string, ContentItem>()

  for (const item of fromIndex) {
    byPath.set(item.path, item)
  }

  for (const item of fromChangelog) {
    const prev = byPath.get(item.path)
    byPath.set(item.path, {
      ...(prev || item),
      ...item,
      date: item.date || prev?.date || '',
      imageSrc: item.imageSrc ?? prev?.imageSrc ?? null,
    })
  }

  return Array.from(byPath.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
