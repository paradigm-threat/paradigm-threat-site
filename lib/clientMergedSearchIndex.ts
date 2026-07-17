/**
 * Browser-only search catalog via Relay QUERY (files index + timeline events).
 */

import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  feelingLuckyPathToHref,
  isFeelingLuckyCandidate,
} from '@/lib/feelingLucky'
import { queryMergedSearchIndex } from '@/lib/queryCatalogFetch'
import {
  eventRowsToIndexedEntries,
  filesRowsToIndexedEntries,
} from '@/lib/queryCatalog'
import { queryRelayOrigin } from '@/lib/relayQuery'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { withFetchReport } from '@/lib/webmcp/fetchProgress'

const CLIENT_INDEX_TIMEOUT_MS = 60_000
const LUCKY_SAMPLE_LIMIT = 40
const LUCKY_TIMEOUT_MS = 15_000

/** Match gateway path_tree content_kind allowlist (excludes images / hubs / README). */
export const LUCKY_FILES_CONTENT_KINDS = [
  'article',
  'investigation',
  'blog',
] as const

/** Timeline rows with a real article body (drops type=manifest synthetic rows). */
export const LUCKY_TIMELINE_TYPES = ['event', 'article'] as const

export async function fetchMergedSearchIndexClient (): Promise<IndexedPathEntry[] | null> {
  if (typeof window === 'undefined') return null

  await remoteRelay.bootstrap()
  const signal = AbortSignal.timeout(CLIENT_INDEX_TIMEOUT_MS)
  const snap = remoteRelay.getSnapshot()

  return withFetchReport('search-index/QUERY', () =>
    queryMergedSearchIndex(snap.filesBaseUrl, snap.timelineBaseUrl, signal),
  )
}

/** Fisher–Yates shuffle (works when gateway ignores `order: random` pre-deploy). */
function shuffleInPlace<T> (arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

/**
 * Cheap Feeling Lucky: QUERY a small random sample from files + timeline,
 * with server-side content filters so the limit is not wasted on assets.
 * Client still re-checks {@link isFeelingLuckyCandidate} as defense in depth.
 */
export async function queryRandomFeelingLuckyHref (
  filesOrigin?: string,
  timelineOrigin?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  await remoteRelay.bootstrap()
  const snap = remoteRelay.getSnapshot()
  const files = filesOrigin ?? snap.filesBaseUrl
  const timeline = timelineOrigin ?? snap.timelineBaseUrl
  const sig = signal ?? AbortSignal.timeout(LUCKY_TIMEOUT_MS)

  return withFetchReport('feeling-lucky/QUERY', async () => {
    const [filesEnv, eventsEnv] = await Promise.all([
      queryRelayOrigin(files, {
        collection: 'index',
        query: { content_kind: [...LUCKY_FILES_CONTENT_KINDS] },
        limit: LUCKY_SAMPLE_LIMIT,
        order: 'random',
        signal: sig,
      }).catch(() => null),
      queryRelayOrigin(timeline, {
        collection: 'events',
        query: { type: [...LUCKY_TIMELINE_TYPES] },
        limit: LUCKY_SAMPLE_LIMIT,
        order: 'random',
        signal: sig,
      }).catch(() => null),
    ])

    const entries: IndexedPathEntry[] = [
      ...(filesEnv ? filesRowsToIndexedEntries(filesEnv.results) : []),
      ...(eventsEnv ? eventRowsToIndexedEntries(eventsEnv.results) : []),
    ]
    if (entries.length === 0) return null

    shuffleInPlace(entries)
    for (const e of entries) {
      if (!isFeelingLuckyCandidate(e.path)) continue
      return feelingLuckyPathToHref(e.path)
    }
    return null
  })
}

/** Random article or timeline event href from a full merged index (webmcp / agents). */
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
