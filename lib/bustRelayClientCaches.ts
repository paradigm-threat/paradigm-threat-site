/**
 * Operator/debug: drop in-tab Relay catalog caches and PWA Cache Storage
 * entries that can sticky-stale article dates / MD after tip moves.
 */

const SW_CACHE_NAMES = [
  'pt-articles',
  'pt-articles-gl',
  'pt-index',
  'pt-index-gl',
  'pt-timeline-events',
  'pt-timeline-index',
] as const

export async function bustRelayClientCaches (): Promise<void> {
  const { clearFilesCatalogCache } = await import('@/lib/filesCatalogCache')
  clearFilesCatalogCache()

  const { clearMergedSearchIndexCache } = await import('@/lib/searchIndexCache')
  clearMergedSearchIndexCache()

  if (typeof caches !== 'undefined') {
    await Promise.all(
      SW_CACHE_NAMES.map(async (name) => {
        try {
          await caches.delete(name)
        } catch {
          /* ignore */
        }
      }),
    )
  }
}

/** Clear caches then reload so QUERY + MD fetch again at tip. */
export async function bustRelayClientCachesAndReload (): Promise<void> {
  await bustRelayClientCaches()
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
