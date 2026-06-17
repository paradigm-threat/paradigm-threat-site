import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { fetchMergedSearchIndexClient } from '@/lib/clientMergedSearchIndex'

let cached: IndexedPathEntry[] | null | undefined
let inflight: Promise<IndexedPathEntry[] | null> | null = null
let indexOverride: (() => Promise<IndexedPathEntry[] | null>) | null = null

export function resetWebMcpIndexCache (): void {
  cached = undefined
  inflight = null
}

/** Test hook: bypass Relay fetch. */
export function setWebMcpSearchIndexOverride (
  fn: (() => Promise<IndexedPathEntry[] | null>) | null
): void {
  indexOverride = fn
  resetWebMcpIndexCache()
}

export async function getWebMcpSearchIndex (): Promise<IndexedPathEntry[] | null> {
  if (indexOverride) return indexOverride()
  if (typeof window === 'undefined') return null
  if (cached !== undefined) return cached
  if (inflight) return inflight

  inflight = fetchMergedSearchIndexClient()
  try {
    const res = await inflight
    cached = res
    return res
  } finally {
    inflight = null
  }
}
