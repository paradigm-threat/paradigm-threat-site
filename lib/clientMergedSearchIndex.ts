/**
 * Browser-only search index: Relay mirrors (index.json + events.json).
 * No Vercel /api/search-index or /api/feeling-lucky — zero Fast Origin Transfer for these flows.
 */

import {
  flattenFilesIndex,
  flattenTimelineEntriesForSearch,
  type IndexedPathEntry,
} from '@/components/helpers/indexHelper'
import {
  feelingLuckyPathToHref,
  isFeelingLuckyCandidate,
} from '@/lib/feelingLucky'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { withFetchReport } from '@/lib/webmcp/fetchProgress'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

const CLIENT_INDEX_TIMEOUT_MS = 60_000

export async function fetchMergedSearchIndexClient (): Promise<IndexedPathEntry[] | null> {
  if (typeof window === 'undefined') return null

  await remoteRelay.bootstrap()
  const pairs = remoteRelay.getRelayPairs()
  const idx = remoteRelay.getActivePairIndex()
  const pair = pairs[idx] ?? pairs[0]
  if (!pair) return null

  const signal = AbortSignal.timeout(CLIENT_INDEX_TIMEOUT_MS)
  const filesData = await withFetchReport('search-index/index.json', () => remoteRelay.fetchIndexJson(signal))
  if (filesData === null) return null

  let fromFiles: IndexedPathEntry[] = []
  try {
    fromFiles = flattenFilesIndex(filesData)
  } catch {
    return null
  }

  let fromTimeline: IndexedPathEntry[] = []
  const timelineUrl = `${pair.timeline.replace(/\/$/, '')}/data/events.json${timelineManifestCacheQuery()}`
  try {
    const eventsRes = await withFetchReport('timeline/events.json', () =>
      fetch(timelineUrl, { cache: 'no-store', signal }))
    if (eventsRes.ok) {
      fromTimeline = flattenTimelineEntriesForSearch(await eventsRes.json())
    }
  } catch {
    fromTimeline = []
  }

  return [...fromFiles, ...fromTimeline]
}

/** Random article or timeline event href on paradigmthreat.net (client-side pick). */
export function pickRandomFeelingLuckyHref (entries: IndexedPathEntry[]): string | null {
  const hrefs = new Set<string>()
  for (const e of entries) {
    if (!isFeelingLuckyCandidate(e.path)) continue
    hrefs.add(feelingLuckyPathToHref(e.path))
  }
  const list = Array.from(hrefs)
  if (list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]!
}
