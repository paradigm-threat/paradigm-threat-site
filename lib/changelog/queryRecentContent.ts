import { classifyContentPath, type ContentKind } from './classifyContentPath'
import type { ContentItem, ContentItemsByTab, RecentFeedEntry, TabContentKind } from './contentTypes'
import { getIndexUpdatedTime, parseIndexUpdated } from '@/lib/indexUpdated'
import { queryRelayOrigin } from '@/lib/relayQuery'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'

export const RECENT_CONTENT_DAYS = 30
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i

type QueryRow = Record<string, unknown>

export type RecentContentErrorKind =
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'empty_index'
  | 'unknown'

export interface RecentContentError {
  kind: RecentContentErrorKind
  message: string
  origin?: string
}

export interface RecentContentResult {
  contentByTab: ContentItemsByTab
  feed: RecentFeedEntry[]
  /** Present when the catalog QUERY failed or returned an unusable index. */
  error?: RecentContentError
  /** Raw QUERY row count before the 30-day filter (diagnostics). */
  catalogRowCount?: number
  origin?: string
}

export function classifyRecentContentError (
  err: unknown,
  origin?: string,
): RecentContentError {
  const name = err instanceof Error ? err.name : ''
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown error')
  const originSuffix = origin ? ` (${origin})` : ''

  if (name === 'AbortError' || /operation was aborted/i.test(raw)) {
    return {
      kind: 'aborted',
      message: `Content index request was aborted${originSuffix}.`,
      origin,
    }
  }
  if (
    name === 'TimeoutError'
    || /timed? ?out/i.test(raw)
    || /timeout after \d+s/i.test(raw)
  ) {
    return {
      kind: 'timeout',
      message: `Timed out loading the content index${originSuffix}. Tried each Relay mirror; check network or switch server.`,
      origin,
    }
  }
  if (/Failed to fetch|NetworkError|CORS|LOAD_FAILED/i.test(raw)) {
    return {
      kind: 'network',
      message: `Network error loading the content index${originSuffix}: ${raw}`,
      origin,
    }
  }
  if (/All files mirrors failed/i.test(raw)) {
    const timedOut = /timeout after \d+s/i.test(raw)
    return {
      kind: timedOut ? 'timeout' : 'network',
      message: timedOut
        ? `Timed out on every Relay files mirror${originSuffix}. ${raw}`
        : raw,
      origin,
    }
  }
  return {
    kind: 'unknown',
    message: `Could not load recent content${originSuffix}: ${raw}`,
    origin,
  }
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

export type RecentContentLoadStep =
  | 'connecting'
  | 'fetching'
  | 'organizing'
  | 'done'
  | 'error'

export const RECENT_CONTENT_LOAD_MESSAGES: Record<RecentContentLoadStep, string> = {
  connecting: 'Checking content index…',
  fetching: 'Fetching recent updates…',
  organizing: 'Organizing articles, investigations, and blog posts…',
  done: 'Ready',
  error: 'Could not load recent content',
}

const EMPTY_RECENT: RecentContentResult = {
  contentByTab: { articles: [], investigations: [], blog: [] },
  feed: [],
}

const QUERY_TIMEOUT_MS = 12_000

function withCatalogMeta (
  result: RecentContentResult,
  rows: QueryRow[],
  origin: string,
): RecentContentResult {
  const catalogRowCount = rows.length
  if (catalogRowCount === 0) {
    return {
      ...result,
      catalogRowCount: 0,
      origin,
      error: {
        kind: 'empty_index',
        message: `Content index at ${origin} returned 0 documents.`,
        origin,
      },
    }
  }
  return {
    ...result,
    catalogRowCount,
    origin,
  }
}

export async function queryRecentFilesContent (
  origin?: string,
  options?: {
    signal?: AbortSignal
    onProgress?: (step: RecentContentLoadStep) => void
  },
): Promise<RecentContentResult> {
  const { signal, onProgress } = options ?? {}
  let resolvedOrigin = (origin ?? '').replace(/\/+$/, '')
  try {
    onProgress?.('connecting')

    const {
      getCachedFilesCatalogResults,
      loadFilesCatalogCached,
      rememberFilesCatalogFromEnvelope,
    } = await import('@/lib/filesCatalogCache')

    // Prefer the race-selected mirror (not env list order). Primary was lon1 and hung QUERY.
    if (typeof window !== 'undefined') {
      const { remoteRelay } = await import('@/lib/remoteRelayStore')
      await remoteRelay.bootstrap()
      if (!resolvedOrigin) {
        resolvedOrigin = remoteRelay.getSnapshot().filesBaseUrl.replace(/\/+$/, '')
      }
    }
    if (!resolvedOrigin) {
      resolvedOrigin = getPrimaryFilesBaseUrl().replace(/\/+$/, '')
    }

    const cached = getCachedFilesCatalogResults(resolvedOrigin)
    if (cached?.length) {
      onProgress?.('organizing')
      const result = withCatalogMeta(
        buildRecentContentFromRows(cached),
        cached,
        resolvedOrigin,
      )
      if (result.error) onProgress?.('error')
      else onProgress?.('done')
      return result
    }

    onProgress?.('fetching')

    if (typeof window !== 'undefined') {
      const { remoteRelay } = await import('@/lib/remoteRelayStore')
      // Failover + per-origin timeout (avoids stuck "Fetching…" when first env host is dead).
      const env = await remoteRelay.queryFiles({
        collection: 'index',
        query: '',
        limit: 10_000,
        signal,
      })
      const active = remoteRelay.getSnapshot().filesBaseUrl.replace(/\/+$/, '')
      const usedOrigin = active || resolvedOrigin
      rememberFilesCatalogFromEnvelope(usedOrigin, env)
      onProgress?.('organizing')
      const result = withCatalogMeta(
        buildRecentContentFromRows(env.results),
        env.results,
        usedOrigin,
      )
      if (result.error) onProgress?.('error')
      else onProgress?.('done')
      return result
    }

    // SSR / non-browser: single origin with hard timeout.
    await loadFilesCatalogCached(resolvedOrigin, async () => {
      return queryRelayOrigin(resolvedOrigin, {
        collection: 'index',
        query: '',
        limit: 10_000,
        signal: signal ?? AbortSignal.timeout(QUERY_TIMEOUT_MS),
      })
    })

    const rows = getCachedFilesCatalogResults(resolvedOrigin) ?? []
    onProgress?.('organizing')
    const result = withCatalogMeta(
      buildRecentContentFromRows(rows),
      rows,
      resolvedOrigin,
    )
    if (result.error) onProgress?.('error')
    else onProgress?.('done')
    return result
  } catch (err) {
    // Unmount / navigation abort — do not surface as a user-facing failure.
    if (signal?.aborted) {
      return { ...EMPTY_RECENT, origin: resolvedOrigin || undefined }
    }
    onProgress?.('error')
    return {
      ...EMPTY_RECENT,
      origin: resolvedOrigin || undefined,
      error: classifyRecentContentError(err, resolvedOrigin || undefined),
    }
  }
}
