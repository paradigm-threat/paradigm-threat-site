import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { fetchMergedSearchIndexClient } from '@/lib/clientMergedSearchIndex'
import { getMergedSearchIndex } from '@/server/remoteFiles'

let cached: IndexedPathEntry[] | null | undefined
let inflight: Promise<IndexedPathEntry[] | null> | null = null

export function isSearchIndexCached(): boolean {
  return cached !== undefined
}

/**
 * Browser-session cache for the merged search index (files + timeline).
 * In the browser, prefers Relay mirror pairs via fetchMergedSearchIndexClient.
 */
export async function getCachedMergedSearchIndex(): Promise<IndexedPathEntry[] | null> {
  if (cached !== undefined) return cached
  if (inflight) return inflight

  const loader =
    typeof window !== 'undefined'
      ? fetchMergedSearchIndexClient()
      : getMergedSearchIndex()

  inflight = loader
  try {
    const res = await inflight
    cached = res
    return res
  } finally {
    inflight = null
  }
}

