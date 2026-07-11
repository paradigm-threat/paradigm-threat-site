/**
 * Browser-only search index via Relay QUERY (files index + timeline events).
 * No GET of index.json / events.json.
 */

import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  feelingLuckyPathToHref,
  isFeelingLuckyCandidate,
} from '@/lib/feelingLucky'
import { queryMergedSearchIndex } from '@/lib/queryCatalogFetch'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { withFetchReport } from '@/lib/webmcp/fetchProgress'

const CLIENT_INDEX_TIMEOUT_MS = 60_000

export async function fetchMergedSearchIndexClient (): Promise<IndexedPathEntry[] | null> {
  if (typeof window === 'undefined') return null

  await remoteRelay.bootstrap()
  const signal = AbortSignal.timeout(CLIENT_INDEX_TIMEOUT_MS)
  const snap = remoteRelay.getSnapshot()

  return withFetchReport('search-index/QUERY', () =>
    queryMergedSearchIndex(snap.filesBaseUrl, snap.timelineBaseUrl, signal),
  )
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
