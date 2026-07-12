import { classifyContentPath, type ContentKind } from './classifyContentPath'
import type { ContentItem, ContentItemsByTab, RecentFeedEntry, TabContentKind } from './contentTypes'
import { getIndexUpdatedTime, parseIndexUpdated } from '@/lib/indexUpdated'
import { queryRelayOrigin } from '@/lib/relayQuery'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

export const RECENT_CONTENT_DAYS = 30
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

type QueryRow = Record<string, unknown>

export interface RecentContentResult {
  contentByTab: ContentItemsByTab
  feed: RecentFeedEntry[]
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

function pathSlug (path: string): string {
  const base = path.replace(/\\/g, '/').split('/').pop() || ''
  return base.replace(/\.[^.]+$/i, '')
}

function titleFromRow (row: QueryRow, path: string): string {
  const title = typeof row._title === 'string' ? row._title : typeof row.title === 'string' ? row.title : ''
  if (title.trim()) return title.trim()
  const base = path.split('/').pop() || path
  return base.replace(/[-_]/g, ' ').replace(/\.[^.]+$/i, '')
}

function kindFromRow (row: QueryRow, path: string): ContentKind {
  // Prefer local exclude rules even if an older index stamped content_kind.
  const classified = classifyContentPath(path)
  if (classified === 'exclude') return 'exclude'

  const kind = typeof row.content_kind === 'string' ? row.content_kind : ''
  if (kind === 'article' || kind === 'investigation' || kind === 'blog' || kind === 'exclude') {
    return kind
  }
  return classified
}

/** Prefer same-directory stem match; fall back to basename-only slug. */
function imageByPath (rows: QueryRow[]): {
  byExactStem: Map<string, string>
  bySlug: Map<string, string>
} {
  const byExactStem = new Map<string, string>()
  const bySlug = new Map<string, string>()
  for (const row of rows) {
    const path = typeof row.path === 'string' ? row.path.replace(/^\/+/, '') : ''
    if (!IMAGE_EXT.test(path)) continue
    const withSlash = `/${path}`
    const stemPath = path.replace(/\.[^.]+$/i, '')
    if (stemPath && !byExactStem.has(stemPath)) {
      byExactStem.set(stemPath, withSlash)
    }
    const slug = pathSlug(path)
    if (slug && !bySlug.has(slug)) {
      bySlug.set(slug, withSlash)
    }
  }
  return { byExactStem, bySlug }
}

function imageForMarkdownPath (
  path: string,
  byExactStem: Map<string, string>,
  bySlug: Map<string, string>,
): string | null {
  const stemPath = path.replace(/\.[^.]+$/i, '')
  return byExactStem.get(stemPath) ?? bySlug.get(pathSlug(path)) ?? null
}

function parseOriginalPublishedAt (value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return parseIndexUpdated(value) ? value.trim() : null
}

function compareByUpdatedDesc (a: ContentItem, b: ContentItem): number {
  const diff = getIndexUpdatedTime(b.updatedAt || b.date) - getIndexUpdatedTime(a.updatedAt || a.date)
  if (diff !== 0) return diff
  return a.path.localeCompare(b.path)
}

export function buildRecentContentFromRows (
  rows: QueryRow[],
  options?: { now?: Date, withinDays?: number },
): RecentContentResult {
  const now = options?.now ?? new Date()
  const withinDays = options?.withinDays ?? RECENT_CONTENT_DAYS
  const cutoffMs = now.getTime() - withinDays * 24 * 60 * 60 * 1000
  const { byExactStem, bySlug } = imageByPath(rows)

  const items: ContentItem[] = []
  for (const row of rows) {
    const path = typeof row.path === 'string' ? row.path.replace(/^\/+/, '') : ''
    if (!path) continue
    const kind = kindFromRow(row, path)
    if (kind === 'exclude') continue

    const updatedRaw = typeof row._updated === 'string' ? row._updated : ''
    const updated = parseIndexUpdated(updatedRaw)
    if (!updated || updated.getTime() < cutoffMs) continue

    const originalPublishedAt = parseOriginalPublishedAt(row._originalPublishedAt)
    const title = titleFromRow(row, path)
    items.push({
      path,
      href: contentHref(path),
      title,
      date: originalPublishedAt ?? updatedRaw,
      updatedAt: updatedRaw,
      originalPublishedAt,
      repo: 'paradigm-threat-files',
      imageSrc: imageForMarkdownPath(path, byExactStem, bySlug),
      kind: kind as TabContentKind,
    })
  }

  const contentByTab: ContentItemsByTab = {
    articles: [],
    investigations: [],
    blog: [],
  }
  for (const item of items) {
    if (item.kind === 'article') contentByTab.articles.push(item)
    else if (item.kind === 'investigation') contentByTab.investigations.push(item)
    else contentByTab.blog.push(item)
  }
  contentByTab.articles.sort(compareByUpdatedDesc)
  contentByTab.investigations.sort(compareByUpdatedDesc)
  contentByTab.blog.sort(compareByUpdatedDesc)

  const feed = [...items]
    .sort(compareByUpdatedDesc)
    .slice(0, 16)
    .map((item): RecentFeedEntry => ({
      repo: item.repo,
      date: item.updatedAt || item.date,
      message: item.title || titleFromRow({}, item.path),
      files: [{ path: item.path, href: item.href, status: 'M' }],
      images: item.imageSrc ? [{ src: item.imageSrc }] : [],
    }))

  return { contentByTab, feed }
}

export async function queryRecentFilesContent (
  origin = getPrimaryFilesBaseUrl(),
  signal?: AbortSignal,
): Promise<RecentContentResult> {
  try {
    const env = await queryRelayOrigin(origin, {
      collection: 'index',
      query: '',
      limit: 10_000,
      signal,
    })
    return buildRecentContentFromRows(env.results)
  } catch {
    return {
      contentByTab: { articles: [], investigations: [], blog: [] },
      feed: [],
    }
  }
}
