import { queryTimelineEventsData } from '@/lib/queryCatalogFetch'
import { getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'

/** QUERY timeline events catalog (no GET of data/events.json). */
export async function fetchTimelineEventsResponse (
  _init?: { next?: { revalidate?: number | false } },
): Promise<Response | null> {
  const data = await queryTimelineEventsData(getPrimaryTimelineBaseUrl())
  if (!data) return null
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
