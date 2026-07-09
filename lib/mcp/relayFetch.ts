/**
 * Server-side Relay mirror fetch for MCP (Node / Vercel).
 * Same public URLs as the browser client — no Next.js proxy layer.
 */

import {
  flattenFilesIndex,
  flattenTimelineEntriesForSearch,
  type IndexedPathEntry,
} from '@/components/helpers/indexHelper'
import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
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

type TimelineNode = {
  id?: string
  md_path?: string
  children?: TimelineNode[]
}

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

  const pairs = relayPairs()
  const v = Math.floor(now / 60000)

  for (const pair of pairs) {
    try {
      const filesBase = pair.files.replace(/\/$/, '')
      const indexRes = await fetchWithTimeout(`${filesBase}/index.json?v=${v}`)
      if (!indexRes.ok) continue

      const fromFiles = flattenFilesIndex(await indexRes.json())

      let fromTimeline: IndexedPathEntry[] = []
      const timelineBase = pair.timeline.replace(/\/$/, '')
      const eventsRes = await fetchWithTimeout(
        `${timelineBase}/data/events.json${timelineManifestCacheQuery()}`,
      )
      if (eventsRes.ok) {
        fromTimeline = flattenTimelineEntriesForSearch(await eventsRes.json())
      }

      const data = [...fromFiles, ...fromTimeline]
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
    const res = await fetchWithTimeout(`${timelineBase}/data/events.json${timelineManifestCacheQuery()}`)
    if (res.ok) {
      const data = (await res.json()) as { entries?: TimelineNode[] }
      const walk = (nodes: TimelineNode[]) => {
        for (const n of nodes) {
          if (typeof n.id === 'string' && typeof n.md_path === 'string') {
            map.set(n.id, n.md_path)
          }
          if (Array.isArray(n.children)) walk(n.children)
        }
      }
      if (Array.isArray(data.entries)) walk(data.entries)
    }
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
