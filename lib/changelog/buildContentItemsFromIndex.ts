import { classifyContentPath, type ContentKind } from './classifyContentPath'
import type { ContentItem, ContentItemsByTab } from './buildContentItemsFromChangelog'
import { parseIndexUpdated } from '@/lib/indexUpdated'

export const RECENT_CONTENT_DAYS = 30

export interface BuildContentItemsFromIndexOptions {
  /** Defaults to `Date.now()` — inject in tests. */
  now?: Date
  withinDays?: number
}

function contentHref (path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith('blog/') && /\.mdx?$/i.test(normalized)) {
    const stem = normalized.slice('blog/'.length).replace(/\.mdx?$/i, '')
    return `/blog/${stem}`
  }
  if (/\/page\.mdx?$/i.test(normalized)) {
    const dir = normalized.replace(/\/page\.mdx?$/i, '')
    return dir ? `/${dir}` : '/'
  }
  if (/\.mdx?$/i.test(normalized)) {
    return `/${normalized.replace(/\.mdx?$/i, '')}`
  }
  return `/${normalized}`
}

function walkIndexLeaves (
  node: Record<string, unknown>,
  prefix: string,
  cutoffMs: number,
  out: ContentItem[],
): void {
  for (const key of Object.keys(node)) {
    if (key.startsWith('_')) continue
    const path = prefix ? `${prefix}/${key}` : key
    const value = node[key]
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue

    const record = value as Record<string, unknown>
    const childKeys = Object.keys(record).filter((k) => !k.startsWith('_'))

    if (childKeys.length === 0) {
      const kind = classifyContentPath(path)
      if (kind === 'exclude') continue

      const updated = parseIndexUpdated(record._updated)
      if (!updated || updated.getTime() < cutoffMs) continue

      out.push({
        path,
        href: contentHref(path),
        date: String(record._updated),
        repo: 'paradigm-threat-files',
        imageSrc: null,
        kind: kind as Exclude<ContentKind, 'exclude'>,
      })
      continue
    }

    walkIndexLeaves(record, path, cutoffMs, out)
  }
}

/**
 * Reader content tabs from index.json: paths with `_updated` within the recent window.
 */
export function buildContentItemsFromIndex (
  indexRoot: Record<string, unknown> | null | undefined,
  options?: BuildContentItemsFromIndexOptions,
): ContentItemsByTab {
  const withinDays = options?.withinDays ?? RECENT_CONTENT_DAYS
  const now = options?.now ?? new Date()
  const cutoffMs = now.getTime() - withinDays * 24 * 60 * 60 * 1000

  const all: ContentItem[] = []
  if (indexRoot && typeof indexRoot === 'object') {
    walkIndexLeaves(indexRoot, '', cutoffMs, all)
  }

  const articles: ContentItem[] = []
  const investigations: ContentItem[] = []
  const blogPosts: ContentItem[] = []

  for (const item of all) {
    if (item.kind === 'article') articles.push(item)
    else if (item.kind === 'investigation') investigations.push(item)
    else blogPosts.push(item)
  }

  const byDateDesc = (a: ContentItem, b: ContentItem) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()

  articles.sort(byDateDesc)
  investigations.sort(byDateDesc)
  blogPosts.sort(byDateDesc)

  return { articles, investigations, blog: blogPosts }
}

/** Overlay changelog slug-matched hero images onto index-backed items. */
export function mergeChangelogImagesIntoItems (
  fromIndex: ContentItemsByTab,
  fromChangelog: ContentItemsByTab,
): ContentItemsByTab {
  const imageByPath = new Map<string, string>()
  for (const tab of ['articles', 'investigations', 'blog'] as const) {
    for (const item of fromChangelog[tab]) {
      if (item.imageSrc) imageByPath.set(item.path, item.imageSrc)
    }
  }

  const merge = (items: ContentItem[]) =>
    items.map((item) => ({
      ...item,
      imageSrc: imageByPath.get(item.path) ?? item.imageSrc,
    }))

  return {
    articles: merge(fromIndex.articles),
    investigations: merge(fromIndex.investigations),
    blog: merge(fromIndex.blog),
  }
}
