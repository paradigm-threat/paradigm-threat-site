/**
 * Shared QUERY-only catalog loaders (no GET of index.json / events.json).
 */

import {
  eventRowsToIndexedEntries,
  eventsRowsToTimelineData,
  filesRowsToIndexedEntries,
  rebuildFilesIndexTree,
} from '@/lib/queryCatalog'
import { queryRelayOrigin, type RelayQueryEnvelope } from '@/lib/relayQuery'
import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import type { TimelineData } from '@/components/TimelineContext'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

function isPathCatalog (env: RelayQueryEnvelope | null): boolean {
  if (!env?.results?.length) return false
  return env.results.some((r) => typeof r.path === 'string' && r.path.length > 0)
}

function isEventsCatalog (env: RelayQueryEnvelope | null): boolean {
  if (!env?.results?.length) return false
  return env.results.some(
    (r) =>
      typeof r.id === 'string' &&
      (typeof r.md_path === 'string' || Array.isArray(r.children) || r.type === 'event' || r.type === 'article'),
  )
}

/** Files-repo path catalog → nested tree with `_count`. */
export async function queryFilesIndexTree (
  origin = getPrimaryFilesBaseUrl(),
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  try {
    const { getCachedFilesCatalogTree, loadFilesCatalogCached } = await import('@/lib/filesCatalogCache')
    const hit = getCachedFilesCatalogTree(origin)
    if (hit) return hit
    return loadFilesCatalogCached(origin, async () => {
      const env = await queryRelayOrigin(origin, {
        collection: 'index',
        query: '',
        limit: 10_000,
        signal,
      })
      return isPathCatalog(env) ? env : null
    })
  } catch {
    return null
  }
}

/**
 * Timeline markdown file-tree catalog (BrowserView / carousel).
 * Prefers collection `files`; if absent (pre-migration fleet), uses `index` only when rows are path docs.
 * Never GETs index.json.
 */
export async function queryTimelineFilesTree (
  queryTimeline: (opts: {
    collection?: string
    query?: string | Record<string, unknown>
    limit?: number
    signal?: AbortSignal
  }) => Promise<RelayQueryEnvelope | null>,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const filesEnv = await queryTimeline({
    collection: 'files',
    query: '',
    limit: 10_000,
    signal,
  })
  if (isPathCatalog(filesEnv)) {
    return rebuildFilesIndexTree(filesEnv!.results)
  }
  const indexEnv = await queryTimeline({
    collection: 'index',
    query: '',
    limit: 10_000,
    signal,
  })
  if (isPathCatalog(indexEnv)) {
    return rebuildFilesIndexTree(indexEnv!.results)
  }
  return null
}

/** Timeline event graph via QUERY (collection `events`, else `index` if it holds events). */
export async function queryTimelineEventsData (
  origin = getPrimaryTimelineBaseUrl(),
  signal?: AbortSignal,
): Promise<TimelineData | null> {
  try {
    let env = await queryRelayOrigin(origin, {
      collection: 'events',
      query: '',
      limit: 10_000,
      signal,
    })
    if (!isEventsCatalog(env)) {
      env = await queryRelayOrigin(origin, {
        collection: 'index',
        query: '',
        limit: 10_000,
        signal,
      })
    }
    if (!isEventsCatalog(env)) return null
    return eventsRowsToTimelineData(env.results)
  } catch {
    return null
  }
}

export async function queryMergedSearchIndex (
  filesOrigin = getPrimaryFilesBaseUrl(),
  timelineOrigin = getPrimaryTimelineBaseUrl(),
  signal?: AbortSignal,
): Promise<IndexedPathEntry[] | null> {
  try {
    const { getCachedFilesIndexedEntries } = await import('@/lib/filesCatalogCache')
    const cachedFiles = getCachedFilesIndexedEntries(filesOrigin)

    const eventsPromise = queryRelayOrigin(timelineOrigin, {
      collection: 'events',
      query: '',
      limit: 10_000,
      signal,
    }).catch(async () =>
      queryRelayOrigin(timelineOrigin, {
        collection: 'index',
        query: '',
        limit: 10_000,
        signal,
      }),
    )

    let fromFiles: IndexedPathEntry[]
    if (cachedFiles) {
      fromFiles = cachedFiles
    } else {
      const filesEnv = await queryRelayOrigin(filesOrigin, {
        collection: 'index',
        query: '',
        limit: 10_000,
        signal,
      })
      if (!isPathCatalog(filesEnv)) return null
      const { rememberFilesCatalogFromEnvelope } = await import('@/lib/filesCatalogCache')
      rememberFilesCatalogFromEnvelope(filesOrigin, filesEnv)
      fromFiles = filesRowsToIndexedEntries(filesEnv.results)
    }

    const eventsEnv = await eventsPromise
    const fromTimeline = isEventsCatalog(eventsEnv)
      ? eventRowsToIndexedEntries(eventsEnv.results)
      : []
    return [...fromFiles, ...fromTimeline]
  } catch {
    return null
  }
}

/** Exact path presence in files index collection. */
export async function queryFilesPathExists (
  path: string,
  origin = getPrimaryFilesBaseUrl(),
  signal?: AbortSignal,
): Promise<boolean> {
  const clean = path.replace(/^\//, '')
  try {
    const env = await queryRelayOrigin(origin, {
      collection: 'index',
      query: { path: clean },
      limit: 1,
      signal,
    })
    return env.results.some((r) => r.path === clean)
  } catch {
    return false
  }
}
