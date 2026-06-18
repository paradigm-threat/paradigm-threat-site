import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
import { withFetchReport } from '@/lib/webmcp/fetchProgress'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

const MD_TIMEOUT_MS = 45_000

type TimelineNode = {
  id?: string
  md_path?: string
  children?: TimelineNode[]
}

let timelineMdPathCache: Map<string, string> | null = null

async function loadTimelineMdPathMap (): Promise<Map<string, string>> {
  if (timelineMdPathCache) return timelineMdPathCache
  const map = new Map<string, string>()
  await remoteRelay.bootstrap()
  const pairs = remoteRelay.getRelayPairs()
  const idx = remoteRelay.getActivePairIndex()
  const pair = pairs[idx] ?? pairs[0]
  if (!pair) {
    timelineMdPathCache = map
    return map
  }
  const url = `${pair.timeline.replace(/\/$/, '')}/data/events.json${timelineManifestCacheQuery()}`
  try {
    const res = await withFetchReport('timeline/events.json', () =>
      fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(MD_TIMEOUT_MS) }))
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

/** Fetch raw markdown for an index path (files repo or timeline event). */
export async function fetchArticleMarkdown (indexPath: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const path = indexPath.replace(/^\//, '')
  const signal = AbortSignal.timeout(MD_TIMEOUT_MS)
  const versionQuery = `?v=${Math.floor(Date.now() / 60000)}`

  if (path.startsWith('timeline/')) {
    const eventId = path.slice('timeline/'.length)
    const map = await loadTimelineMdPathMap()
    const mdPath = map.get(eventId)
    if (!mdPath) return null
    try {
      return await withFetchReport(mdPath, async () => {
        const res = await remoteRelay.fetchTimelineMd(mdPath, timelineManifestCacheQuery(), signal)
        if (!res.ok) return null
        return await res.text()
      })
    } catch {
      return null
    }
  }

  const sitePath = path.replace(/\.(md|mdx)$/i, '')
  try {
    return await withFetchReport(path, async () => {
      const res = await remoteRelay.fetchFilesMd(sitePath, versionQuery, signal)
      if (!res.ok) return null
      return await res.text()
    })
  } catch {
    return null
  }
}

export function articleMdCandidatePaths (path: string): string[] {
  return buildArticleMdCandidatePaths(path)
}
