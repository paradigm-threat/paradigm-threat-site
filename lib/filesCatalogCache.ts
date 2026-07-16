/**
 * Session-scoped cache for files QUERY catalogs (flat rows + nested tree).
 * Dedupes concurrent full-catalog fetches across FilesContext, search, and failover.
 */

import { filesRowsToIndexedEntries, rebuildFilesIndexTree } from '@/lib/queryCatalog'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import type { RelayQueryEnvelope } from '@/lib/relayQuery'

type FilesCatalogEntry = {
  origin: string
  results: Record<string, unknown>[]
  tree: Record<string, unknown>
  indexedHead?: string
  fetchedAt: number
}

const TTL_MS = 10 * 60_000

let entry: FilesCatalogEntry | null = null
let inflight: Promise<FilesCatalogEntry | null> | null = null
let inflightOrigin: string | null = null

function originKey (origin: string): string {
  return origin.replace(/\/+$/, '')
}

export function getCachedFilesCatalogTree (origin: string): Record<string, unknown> | null {
  const e = entry
  if (!e) return null
  if (originKey(e.origin) !== originKey(origin)) return null
  if (Date.now() - e.fetchedAt > TTL_MS) return null
  return e.tree
}

export function getCachedFilesIndexedEntries (origin: string): IndexedPathEntry[] | null {
  const e = entry
  if (!e) return null
  if (originKey(e.origin) !== originKey(origin)) return null
  if (Date.now() - e.fetchedAt > TTL_MS) return null
  return filesRowsToIndexedEntries(e.results)
}

export function getCachedFilesCatalogResults (origin: string): Record<string, unknown>[] | null {
  const e = entry
  if (!e) return null
  if (originKey(e.origin) !== originKey(origin)) return null
  if (Date.now() - e.fetchedAt > TTL_MS) return null
  return e.results
}

export function rememberFilesCatalogFromEnvelope (
  origin: string,
  env: RelayQueryEnvelope,
): Record<string, unknown> | null {
  if (!catalogEnvelopeHasPaths(env)) return null
  const tree = rebuildFilesIndexTree(env.results)
  entry = {
    origin: originKey(origin),
    results: env.results,
    tree,
    indexedHead: env.indexedHead,
    fetchedAt: Date.now(),
  }
  return tree
}

/** True when a QUERY envelope has at least one path document (usable files catalog). */
export function catalogEnvelopeHasPaths (env: {
  results?: unknown
  docCount?: unknown
} | null | undefined): boolean {
  if (!env) return false
  if (typeof env.docCount === 'number' && env.docCount > 0) return true
  if (!Array.isArray(env.results) || env.results.length === 0) return false
  return env.results.some(
    (r) => r && typeof r === 'object' && typeof (r as { path?: unknown }).path === 'string' &&
      String((r as { path: string }).path).length > 0,
  )
}

/**
 * Run `loader` once per origin; concurrent callers share the same promise.
 * `loader` should QUERY the full files index and return the envelope (or null).
 */
export async function loadFilesCatalogCached (
  origin: string,
  loader: () => Promise<RelayQueryEnvelope | null>,
): Promise<Record<string, unknown> | null> {
  const key = originKey(origin)
  const hit = getCachedFilesCatalogTree(key)
  if (hit) return hit

  if (inflight && inflightOrigin === key) {
    const shared = await inflight
    return shared?.tree ?? null
  }

  inflightOrigin = key
  inflight = (async () => {
    try {
      const env = await loader()
      if (!env) return null
      const tree = rememberFilesCatalogFromEnvelope(key, env)
      if (!tree || !entry) return null
      return entry
    } catch {
      return null
    } finally {
      inflight = null
      inflightOrigin = null
    }
  })()

  const loaded = await inflight
  return loaded?.tree ?? null
}

export function clearFilesCatalogCache (): void {
  entry = null
  inflight = null
  inflightOrigin = null
}

/** Test helper */
export function _filesCatalogCacheForTests () {
  return { entry, inflightOrigin, TTL_MS }
}
