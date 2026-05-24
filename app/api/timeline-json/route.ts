import { NextResponse } from 'next/server'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'
import { getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import { buildTimelineJsJsonFromEvents } from '@/lib/timelineJsData'
import { serverRelayApiDisabledResponse } from '@/lib/serverRelayApiGuard'

const TIMELINE_BASE = getPrimaryTimelineBaseUrl()

export async function GET () {
  const blocked = serverRelayApiDisabledResponse()
  if (blocked) return blocked

  try {
    const res = await fetch(`${TIMELINE_BASE}/data/events.json${timelineManifestCacheQuery()}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('Failed to fetch events')
    const data = await res.json()
    const entries = data.entries || []
    const json = buildTimelineJsJsonFromEvents(entries)

    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to build timeline' }, { status: 500 })
  }
}
