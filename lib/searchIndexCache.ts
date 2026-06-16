import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { getMergedSearchIndex } from '@/server/remoteFiles'

let cached: IndexedPathEntry[] | null | undefined
let inflight: Promise<IndexedPathEntry[] | null> | null = null

export function isSearchIndexCached(): boolean {
  return cached !== undefined
}

/**
 * Browser-session cache for the merged search index.
 * Helps prevent the search page from refetching (and re-showing loading UI)
 * when the input is updated or the route re-renders.
 */
export async function getCachedMergedSearchIndex(): Promise<IndexedPathEntry[] | null> {
  if (cached !== undefined) return cached
  if (inflight) return inflight

  inflight = getMergedSearchIndex()
  try {
    const res = await inflight
    cached = res
    return res
  } finally {
    inflight = null
  }
}

