/**
 * Server-side Relay mirror fetch for MCP (Node / Vercel).
 * Same public URLs as the browser client — no Next.js proxy layer.
 */

import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
import { eventsRowsToTimelineData } from '@/lib/queryCatalog'
import { queryRelayOrigin } from '@/lib/relayQuery'
import { parseSiteClaimsJson } from '@/lib/siteAi/parseSiteClaims'
import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'
import {
  getPrimaryFilesBaseUrl,
  getPrimaryTimelineBaseUrl,
  getFilesBaseUrlList,
  getTimelineBaseUrlList,
  zipRelayPairs,
} from '@/lib/urlListEnv'

const FETCH_TIMEOUT_MS = 60_000

let mergedIndexCache: { at: number; data: IndexedPathEntry[] } | null = null
let siteClaimsCache: { at: number; data: SiteClaimEntry[] } | null = null
let timelineMdPathCache: Map<string, string> | null = null

const INDEX_CACHE_MS = 5 * 60 * 1000

function relayPairs () {
  return zipRelayPairs(getFilesBaseUrlList(), getTimelineBaseUrlList())
}

async function fetchWithTimeout (url: string, init?: RequestInit): Promise<Response> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  return fetch(url, { ...init, signal, cache: 'no-store' })
}

export function resetMcpRelayCaches (): void {
  mergedIndexCache = null
  siteClaimsCache = null
  timelineMdPathCache = null
}

export async function fetchMergedSearchIndexServer (): Promise<IndexedPathEntry[] | null> {
  const now = Date.now()
  if (mergedIndexCache && now - mergedIndexCache.at < INDEX_CACHE_MS) {
    return mergedIndexCache.data
  }

  const { queryMergedSearchIndex } = await import('@/lib/queryCatalogFetch')
  const pairs = relayPairs()
  for (const pair of pairs) {
    try {
      const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
      const data = await queryMergedSearchIndex(pair.files, pair.timeline, signal)
      if (!data) continue
      mergedIndexCache = { at: now, data }
      return data
    } catch {
      continue
    }
  }

  return null
}

export async function fetchSiteClaimsServer (): Promise<SiteClaimEntry[] | null> {
  const now = Date.now()
  if (siteClaimsCache && now - siteClaimsCache.at < INDEX_CACHE_MS) {
    return siteClaimsCache.data
  }

  const pairs = relayPairs()
  const v = Math.floor(now / 60000)

  for (const pair of pairs) {
    try {
      const url = `${pair.files.replace(/\/$/, '')}/site-claims.json?v=${v}`
      const res = await fetchWithTimeout(url)
      if (!res.ok) continue
      const claims = parseSiteClaimsJson(await res.json())
      siteClaimsCache = { at: now, data: claims }
      return claims
    } catch {
      continue
    }
  }

  return null
}

async function loadTimelineMdPathMapServer (): Promise<Map<string, string>> {
  if (timelineMdPathCache) return timelineMdPathCache

  const map = new Map<string, string>()
  const timelineBase = getPrimaryTimelineBaseUrl().replace(/\/$/, '')

  try {
    const env = await queryRelayOrigin(timelineBase, {
      collection: 'events',
      query: '',
      limit: 10_000,
      order: 'sort_key',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const { entries } = eventsRowsToTimelineData(env.results)
    const walk = (nodes: { id?: string; md_path?: string; children?: unknown[] }[]) => {
      for (const n of nodes) {
        if (typeof n.id === 'string' && typeof n.md_path === 'string') {
          map.set(n.id, n.md_path)
        }
        if (Array.isArray(n.children)) walk(n.children as typeof nodes)
      }
    }
    if (Array.isArray(entries)) walk(entries)
  } catch {
    // empty map
  }

  timelineMdPathCache = map
  return map
}

export async function fetchArticleMarkdownServer (indexPath: string): Promise<string | null> {
  const path = indexPath.replace(/^\//, '')
  const versionQuery = `?v=${Math.floor(Date.now() / 60000)}`

  if (path.startsWith('timeline/')) {
    const eventId = path.slice('timeline/'.length)
    const map = await loadTimelineMdPathMapServer()
    const mdPath = map.get(eventId)
    if (!mdPath) return null
    const timelineBase = getPrimaryTimelineBaseUrl().replace(/\/$/, '')
    try {
      const res = await fetchWithTimeout(`${timelineBase}/${mdPath.replace(/^\//, '')}${timelineManifestCacheQuery()}`)
      if (!res.ok) return null
      return await res.text()
    } catch {
      return null
    }
  }

  const filesBase = getPrimaryFilesBaseUrl().replace(/\/$/, '')
  const sitePath = path.replace(/\.(md|mdx)$/i, '')
  const candidates = buildArticleMdCandidatePaths(sitePath)

  for (const relPath of candidates) {
    try {
      const res = await fetchWithTimeout(`${filesBase}/${relPath.replace(/^\//, '')}${versionQuery}`)
      if (res.ok) return await res.text()
    } catch {
      continue
    }
  }

  return null
}
