/**
 * Fetch static assets from paradigm-threat-files or paradigm-threat-timeline
 * origins with mirror fallback (same lists as urlListEnv / timelineOrigins).
 */

import { getFilesBaseUrlList } from '@/lib/urlListEnv'
import { getTimelineOrigins } from '@/lib/timelineOrigins'
import {
  MIRROR_ARTICLE_REVALIDATE_SEC,
  mirrorFetchNext,
} from '@/lib/serverMirrorRevalidate'

const FETCH_TIMEOUT_MS = 45_000

export type RemoteAssetRepo = 'files' | 'timeline'

export function getOriginsForRepo (repo: RemoteAssetRepo): string[] {
  return repo === 'files' ? getFilesBaseUrlList() : getTimelineOrigins()
}

function shuffledOrigins (origins: string[]): string[] {
  const out = [...origins]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export interface FetchFromAssetMirrorsInit {
  method?: 'GET' | 'HEAD'
  /** Query string including leading `?`, e.g. `?v=123` */
  search?: string
  cache?: RequestCache
  next?: { revalidate?: number | false }
  /** Extra request headers (e.g. `Accept: text/html` for relay static markdown HTML). */
  headers?: Record<string, string>
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
  const origins = shuffledOrigins(getOriginsForRepo(repo))
  if (!origins.length) return null

  /** HTTP status per origin attempt, or -1 if fetch threw (e.g. network). */
  const attemptOutcomes: number[] = []

  for (const origin of origins) {
    const url = `${origin.replace(/\/$/, '')}${path}${search}`
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ac.signal,
        headers: {
          'Accept-Encoding': 'identity',
          ...init.headers,
        },
        ...(init.cache !== undefined ? { cache: init.cache } : {}),
        ...(init.next !== undefined
          ? { next: init.next }
          : init.cache === undefined
            ? { next: mirrorFetchNext(MIRROR_ARTICLE_REVALIDATE_SEC) }
            : {}),
      })
      attemptOutcomes.push(res.status)
      if (res.ok) return res
    } catch {
      attemptOutcomes.push(-1)
    } finally {
      clearTimeout(timer)
    }
  }

  const allMissing =
    attemptOutcomes.length > 0 && attemptOutcomes.every((s) => s === 404)
  if (!allMissing) {
    console.warn(
      '[server-mirror]',
      JSON.stringify({
        repo,
        path,
        originCount: origins.length,
        attempts: attemptOutcomes,
      }),
    )
  }
  return null
}
