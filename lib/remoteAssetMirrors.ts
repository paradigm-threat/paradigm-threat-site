/**
 * Fetch static assets from paradigm-threat-files or paradigm-threat-timeline
 * origins with mirror fallback (same lists as urlListEnv / timelineOrigins).
 */

import { getFilesBaseUrlList } from '@/lib/urlListEnv'
import { getTimelineOrigins } from '@/lib/timelineOrigins'

const FETCH_TIMEOUT_MS = 45_000

export type RemoteAssetRepo = 'files' | 'timeline'

export function getOriginsForRepo (repo: RemoteAssetRepo): string[] {
  return repo === 'files' ? getFilesBaseUrlList() : getTimelineOrigins()
}

export interface FetchFromAssetMirrorsInit {
  method?: 'GET' | 'HEAD'
  /** Query string including leading `?`, e.g. `?v=123` */
  search?: string
  cache?: RequestCache
  next?: { revalidate?: number | false }
}

/**
 * @param pathname Absolute path on the upstream site, e.g. `/data/events.json` or `/events/foo.png`
 */
export async function fetchFromAssetMirrors (
  repo: RemoteAssetRepo,
  pathname: string,
  init: FetchFromAssetMirrorsInit = {}
): Promise<Response | null> {
  const method = init.method ?? 'GET'
  const search = init.search ?? ''
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const origins = getOriginsForRepo(repo)
  if (!origins.length) return null

  for (const origin of origins) {
    const url = `${origin.replace(/\/$/, '')}${path}${search}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'Accept-Encoding': 'identity' },
        cache: init.cache ?? 'no-store',
        ...(init.next !== undefined ? { next: init.next } : {}),
      })
      if (res.ok) return res
    } catch {
      /* try next mirror */
    } finally {
      clearTimeout(timer)
    }
  }
  console.error(
    '[server-mirror]',
    JSON.stringify({
      repo,
      path,
      originCount: origins.length,
    }),
  )
  return null
}
