import { classifyContentPath, type ContentKind } from './classifyContentPath'
import type { ContentItem, ContentItemsByTab } from './contentTypes'
import { parseIndexUpdated, getIndexUpdatedTime } from '@/lib/indexUpdated'

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

function parseOriginalPublishedAt (value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = parseIndexUpdated(value)
  return d ? value.trim() : null
}

function sortDateForItem (item: ContentItem): number {
  return getIndexUpdatedTime(item.date)
}

function compareContentItemsByDate (a: ContentItem, b: ContentItem): number {
  const diff = sortDateForItem(b) - sortDateForItem(a)
  if (diff !== 0) return diff
  return a.path.localeCompare(b.path)
}

function sortArticlesAndInvestigations (items: ContentItem[]): void {
  items.sort(compareContentItemsByDate)
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

      const updatedRaw = String(record._updated)
      const originalPublishedAt = parseOriginalPublishedAt(record._originalPublishedAt)
      const sortDate = originalPublishedAt ?? updatedRaw

      out.push({
        path,
        href: contentHref(path),
        date: sortDate,
        updatedAt: updatedRaw,
        originalPublishedAt,
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
 * Reader content tabs from the files catalog: paths with `_updated` within the recent window.
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

  sortArticlesAndInvestigations(articles)
  sortArticlesAndInvestigations(investigations)
  blogPosts.sort(compareContentItemsByDate)

  return { articles, investigations, blog: blogPosts }
}

