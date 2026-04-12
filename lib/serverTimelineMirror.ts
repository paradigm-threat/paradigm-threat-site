import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

/** First mirror that returns ok for timeline `data/events.json` */
export async function fetchTimelineEventsResponse (
  init?: { next?: { revalidate?: number | false } },
): Promise<Response | null> {
  const q = timelineManifestCacheQuery()
  return fetchFromAssetMirrors('timeline', '/data/events.json', {
    search: q,
    next: init?.next ?? { revalidate: 60 },
  })
}
