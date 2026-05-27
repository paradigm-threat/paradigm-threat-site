/**
 * Server-side timeline event lookup for metadata (OG, title).
 */

import { firstTimelineOgMediaPath } from '@/lib/timelineMedia'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'

const TIMELINE_BASE = getPrimaryTimelineBaseUrl()

interface TimelineEntry {
  id: string
  title: string
  media?: Array<string | { path: string; bookIllustration?: boolean }>
  children?: TimelineEntry[]
}

function flattenEntries(entries: TimelineEntry[]): TimelineEntry[] {
  const result: TimelineEntry[] = []
  function visit(nodes: TimelineEntry[]) {
    for (const e of nodes) {
      result.push(e)
      if (e.children?.length) visit(e.children)
    }
  }
  visit(entries)
  return result
}

export interface TimelineEventMeta {
  title: string
  ogImageUrl?: string
}

export async function getTimelineEventMeta(eventId: string): Promise<TimelineEventMeta | null> {
  try {
    const res = await fetch(`${TIMELINE_BASE}/data/events.json${timelineManifestCacheQuery()}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const entries = (data.entries || []) as TimelineEntry[]
    const events = flattenEntries(entries)
    const event = events.find((e) => e.id === eventId)
    if (!event) return null

    const ogPath = firstTimelineOgMediaPath(event.media)
    const ogImageUrl = ogPath
      ? buildOptimizedAssetUrl(ogPath.startsWith('/') ? ogPath : `/${ogPath}`, 800)
      : undefined

    return {
      title: event.title,
      ogImageUrl
    }
  } catch {
    return null
  }
}
