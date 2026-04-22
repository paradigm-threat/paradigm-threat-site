import {
  getFilesBaseUrlList,
  getTimelineBaseUrlList,
  zipRelayPairs,
  type RelayOriginPair,
} from '@/lib/urlListEnv'
import { sendClientTelemetry } from '@/lib/clientTelemetrySend'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

export function relayHostLabel(origin: string): string {
  if (!origin) return ''
  try {
    return new URL(origin).host || origin
  } catch {
    return origin
  }
}

export type RelayNotifyEvent =
  | {
      type: 'ready'
      filesOrigin: string
      timelineOrigin: string
      serverLabel: string
    }
  | {
      type: 'switch'
      reason: 'index_failover' | 'md_failover' | 'timeline_md_failover'
      filesOrigin: string
      timelineOrigin: string
      serverLabel: string
    }

const PROBE_TIMEOUT_MS = 8000
const MD_FETCH_TIMEOUT_MS = 12_000
const INDEX_FETCH_TIMEOUT_MS = 5000

/**
 * Among mirrors whose probe time is within this band of the fastest, pick one at random.
 * Spreads load when latency is similar; still strongly prefers clearly faster mirrors.
 */
const NEAR_BEST_MIN_EXTRA_MS = 100
const NEAR_BEST_RELATIVE_EXTRA = 0.2

function extraMsNearBestBand(fastestProbeMs: number): number {
  if (!Number.isFinite(fastestProbeMs) || fastestProbeMs < 0) {
    return NEAR_BEST_MIN_EXTRA_MS
  }
  return Math.max(NEAR_BEST_MIN_EXTRA_MS, fastestProbeMs * NEAR_BEST_RELATIVE_EXTRA)
}

type ScoredProbe = {
  pair: RelayOriginPair
  scoreMs: number
}

/**
 * `sorted` must be ascending by `scoreMs`. Returns a random element among those
 * within the performance band of the fastest.
 */
function pickRandomAmongNearBest(sorted: ScoredProbe[]): RelayOriginPair {
  const fastest = sorted[0]!
  const limit = fastest.scoreMs + extraMsNearBestBand(fastest.scoreMs)
  const pool = sorted.filter((r) => r.scoreMs <= limit)
  return pool[Math.floor(Math.random() * pool.length)]!.pair
}

function mergeAbort(parent: AbortSignal, timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    try {
      const t = AbortSignal.timeout(timeoutMs)
      if (typeof (AbortSignal as unknown as { any?: typeof AbortSignal.any }).any === 'function') {
        return AbortSignal.any([parent, t])
      }
    } catch {
      /* fall through */
    }
  }
  const c = new AbortController()
  const onParent = () => c.abort()
  parent.addEventListener('abort', onParent)
  const tid = setTimeout(() => c.abort(), timeoutMs)
  parent.addEventListener('abort', () => clearTimeout(tid), { once: true })
  return c.signal
}

function t0(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

class RemoteRelayStore {
  private pairs: RelayOriginPair[] = []
  private filesOrigin = ''
  private timelineOrigin = ''
  private bootstrapDone = false
  private bootstrapP: Promise<void> | null = null
  private listeners = new Set<() => void>()
  private notifyListeners = new Set<(e: RelayNotifyEvent) => void>()

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  subscribeNotify(cb: (e: RelayNotifyEvent) => void): () => void {
    this.notifyListeners.add(cb)
    return () => this.notifyListeners.delete(cb)
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb())
  }

  private emitNotify(e: RelayNotifyEvent): void {
    this.notifyListeners.forEach((cb) => {
      try {
        cb(e)
      } catch {
        /* ignore */
      }
    })
  }

  private ensurePairs(): void {
    const files = getFilesBaseUrlList()
    const timeline = getTimelineBaseUrlList()
    this.pairs = zipRelayPairs(files, timeline)
    if (!this.filesOrigin && this.pairs.length > 0) {
      this.filesOrigin = this.pairs[0]!.files
      this.timelineOrigin = this.pairs[0]!.timeline
    }
  }

  /** Current pair first, then remaining pairs (for failover). */
  private pairFailoverOrder(): RelayOriginPair[] {
    this.ensurePairs()
    if (this.pairs.length === 0) return []
    const cur = this.pairs.find(
      (p) => p.files === this.filesOrigin && p.timeline === this.timelineOrigin,
    )
    if (!cur) return [...this.pairs]
    const rest = this.pairs.filter((p) => p !== cur)
    return [cur, ...rest]
  }

  private switchToPair(
    p: RelayOriginPair,
    reason: 'index_failover' | 'md_failover' | 'timeline_md_failover',
  ): void {
    const changed = p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin
    this.filesOrigin = p.files
    this.timelineOrigin = p.timeline
    this.emit()
    if (changed) {
      this.emitNotify({
        type: 'switch',
        reason,
        filesOrigin: this.filesOrigin,
        timelineOrigin: this.timelineOrigin,
        serverLabel: relayHostLabel(this.filesOrigin),
      })
    }
  }

  private finishBootstrap(p: RelayOriginPair): void {
    this.filesOrigin = p.files
    this.timelineOrigin = p.timeline
    this.bootstrapDone = true
    this.emit()
    this.emitNotify({
      type: 'ready',
      filesOrigin: this.filesOrigin,
      timelineOrigin: this.timelineOrigin,
      serverLabel: relayHostLabel(this.filesOrigin),
    })
  }

  getSnapshot() {
    this.ensurePairs()
    const fb = this.filesOrigin || this.pairs[0]?.files || ''
    const tb = this.timelineOrigin || this.pairs[0]?.timeline || ''
    return {
      filesBaseUrl: fb,
      timelineBaseUrl: tb,
      relayBootstrapDone: this.bootstrapDone,
      filesHostLabel: relayHostLabel(fb),
      timelineHostLabel: relayHostLabel(tb),
      serverLabel: relayHostLabel(fb),
    }
  }

  async bootstrap(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.bootstrapP) return this.bootstrapP
    this.bootstrapP = this.runBootstrap()
    return this.bootstrapP
  }

  private async probePair(p: RelayOriginPair): Promise<{
    pair: RelayOriginPair
    bothOk: boolean
    scoreMs: number
    filesOk: boolean
    timelineOk: boolean
  }> {
    const filesUrl = `${p.files.replace(/\/$/, '')}/index.json`
    const timelineUrl = `${p.timeline.replace(/\/$/, '')}/data/events.json${timelineManifestCacheQuery()}`
    const start = t0()
    let filesOk = false
    let timelineOk = false
    try {
      const [rf, rt] = await Promise.all([
        fetch(filesUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        }),
        fetch(timelineUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        }),
      ])
      filesOk = rf.ok
      timelineOk = rt.ok
    } catch {
      /* leave flags false */
    }
    const ms = t0() - start
    const bothOk = filesOk && timelineOk
    return {
      pair: p,
      bothOk,
      scoreMs: ms,
      filesOk,
      timelineOk,
    }
  }

  private async pickFastestPair(): Promise<RelayOriginPair> {
    this.ensurePairs()
    if (this.pairs.length <= 1) return this.pairs[0]!

    const results = await Promise.all(this.pairs.map((p) => this.probePair(p)))
    const dual = results.filter((r) => r.bothOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (dual.length > 0) return pickRandomAmongNearBest(dual)

    const filesOnly = results.filter((r) => r.filesOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (filesOnly.length > 0) return pickRandomAmongNearBest(filesOnly)

    const timelineOnly = results.filter((r) => r.timelineOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (timelineOnly.length > 0) return pickRandomAmongNearBest(timelineOnly)

    return this.pairs[0]!
  }

  private async runBootstrap(): Promise<void> {
    this.ensurePairs()
    const best = await this.pickFastestPair()
    this.finishBootstrap(best)
  }

  /**
   * Load index.json from the active pair, then other pairs on timeout/error.
   */
  async fetchIndexJson(externalAbort: AbortSignal): Promise<unknown | null> {
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    let lastErr: Error | null = null
    for (const p of order) {
      const v = Math.floor(Date.now() / 60000)
      const url = `${p.files.replace(/\/$/, '')}/index.json?v=${v}`
      const signal = mergeAbort(externalAbort, INDEX_FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal, cache: 'no-store' })
        if (!res.ok) continue
        const data = (await res.json()) as unknown
        if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
          this.switchToPair(p, 'index_failover')
        }
        return data
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
      }
    }
    if (lastErr) console.warn('[remoteRelay] fetchIndexJson:', lastErr.message)
    return null
  }

  /**
   * Fetch a markdown file from the files mirror; on timeout/error try other pairs.
   */
  async fetchFilesMd(fullPath: string, versionQuery: string, externalAbort: AbortSignal): Promise<Response> {
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    let lastErr: Error | null = null
    for (const p of order) {
      const base = p.files
      const url = `${base.replace(/\/$/, '')}/${fullPath.replace(/^\//, '')}${versionQuery}`
      const signal = mergeAbort(externalAbort, MD_FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal })
        if (!res.ok) continue
        if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
          this.switchToPair(p, 'md_failover')
        }
        return res
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
      }
    }
    const err = lastErr ?? new Error('All relay pairs failed for files MD')
    const summary = order.map((p) => relayHostLabel(p.files)).join(', ')
    sendClientTelemetry({
      kind: 'mirror_md_failed',
      mirrorPhase: 'files_md',
      message: err.message.slice(0, 500),
      mirrorResourcePath: fullPath.replace(/^\//, '').slice(0, 200),
      attemptedHostCount: order.length,
      attemptedHostsSummary: summary.slice(0, 200),
    })
    throw err
  }

  /**
   * Fetch timeline content markdown; on timeout/error try other pairs (switches paired origins).
   */
  async fetchTimelineMd(
    mdPath: string,
    cacheQuery: string,
    externalAbort: AbortSignal,
  ): Promise<Response> {
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    let lastErr: Error | null = null
    const q = cacheQuery.startsWith('?') ? cacheQuery : cacheQuery ? `?${cacheQuery}` : ''
    for (const p of order) {
      const url = `${p.timeline.replace(/\/$/, '')}/${mdPath.replace(/^\//, '')}${q}`
      const signal = mergeAbort(externalAbort, MD_FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal })
        if (!res.ok) continue
        if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
          this.switchToPair(p, 'timeline_md_failover')
        }
        return res
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
      }
    }
    const err = lastErr ?? new Error('All relay pairs failed for timeline MD')
    const summary = order.map((p) => relayHostLabel(p.timeline)).join(', ')
    sendClientTelemetry({
      kind: 'mirror_md_failed',
      mirrorPhase: 'timeline_md',
      message: err.message.slice(0, 500),
      mirrorResourcePath: mdPath.replace(/^\//, '').slice(0, 200),
      attemptedHostCount: order.length,
      attemptedHostsSummary: summary.slice(0, 200),
    })
    throw err
  }
}

export const remoteRelay = new RemoteRelayStore()
