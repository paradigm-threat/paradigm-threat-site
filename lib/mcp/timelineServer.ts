import { getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

export type TimelineEventEntry = {
  id: string
  title: string
  md_path?: string
  type?: 'article' | 'event'
  dates?: Array<{
    start?: number | null
    end?: number
    source?: string
    note?: string
    display_year?: string
  }>
  children?: TimelineEventEntry[]
}

let eventsCache: { at: number; flat: TimelineEventEntry[] } | null = null
const CACHE_MS = 5 * 60 * 1000

function flatten (entries: TimelineEventEntry[]): TimelineEventEntry[] {
  const out: TimelineEventEntry[] = []
  const walk = (nodes: TimelineEventEntry[]) => {
    for (const n of nodes) {
      out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(entries)
  return out
}

export function resetTimelineServerCache (): void {
  eventsCache = null
}

export async function fetchTimelineEventsServer (): Promise<TimelineEventEntry[]> {
  const now = Date.now()
  if (eventsCache && now - eventsCache.at < CACHE_MS) return eventsCache.flat

  const base = getPrimaryTimelineBaseUrl().replace(/\/$/, '')
  const res = await fetch(`${base}/data/events.json${timelineManifestCacheQuery()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) return []

  const data = (await res.json()) as { entries?: TimelineEventEntry[] }
  const flat = flatten(data.entries ?? [])
  eventsCache = { at: now, flat }
  return flat
}

export async function findTimelineEventById (eventId: string): Promise<TimelineEventEntry | null> {
  const events = await fetchTimelineEventsServer()
  return events.find((e) => e.id === eventId) ?? null
}
