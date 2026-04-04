import { getTimelineOrigins } from '@/lib/timelineOrigins'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

const FETCH_TIMEOUT_MS = 20_000

/** First mirror that returns ok for timeline events.json */
export async function fetchTimelineEventsResponse(init?: RequestInit): Promise<Response | null> {
  const bases = getTimelineOrigins()
  const q = timelineManifestCacheQuery()
  for (const base of bases) {
    const url = `${base.replace(/\/$/, '')}/data/events.json${q}`
    try {
      const r = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (r.ok) return r
    } catch {
      /* try next */
    }
  }
  return null
}
