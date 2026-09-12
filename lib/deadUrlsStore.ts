'use client'

import { remoteRelay } from '@/lib/remoteRelayStore'
import {
  type DeadUrlMap,
  parseDeadUrlMap,
} from '@/lib/normalizeHttpHref'

let map: DeadUrlMap = {}
let loadedKey = ''
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit (): void {
  for (const cb of listeners) cb()
}

export function subscribeDeadUrls (cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function getDeadUrlsSnapshot (): DeadUrlMap {
  return map
}

async function fetchDeadJson (origin: string, signal?: AbortSignal): Promise<DeadUrlMap> {
  if (!origin) return {}
  const url = `${origin.replace(/\/$/, '')}/hooks/dead-urls.json`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return {}
    return parseDeadUrlMap(await res.text())
  } catch {
    return {}
  }
}

/**
 * One prefetch when files/timeline origins are known. Does not delay article paint.
 * Empty/missing JSON leaves the map empty (links render as today).
 */
export async function prefetchDeadUrls (signal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return
  await remoteRelay.bootstrap()
  const snap = remoteRelay.getSnapshot()
  const files = snap.filesBaseUrl || ''
  const timeline = snap.timelineBaseUrl || ''
  const key = `${files}|${timeline}`
  if (!files && !timeline) return
  if (key === loadedKey) return
  if (inflight) await inflight
  if (key === loadedKey) return
  inflight = (async () => {
    const [filesMap, timelineMap] = await Promise.all([
      fetchDeadJson(files, signal),
      fetchDeadJson(timeline, signal),
    ])
    map = { ...filesMap, ...timelineMap }
    loadedKey = key
    emit()
  })()
  try {
    await inflight
  } finally {
    inflight = null
  }
}
