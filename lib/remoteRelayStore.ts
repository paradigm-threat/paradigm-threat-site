import {
  getFilesBaseUrlList,
  getTimelineBaseUrlList,
  rewriteRetiredRelayOrigin,
  zipRelayPairs,
  type RelayOriginPair,
} from '@/lib/urlListEnv'
import { sendClientTelemetry } from '@/lib/clientTelemetrySend'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'
import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'
import { isRelayRepoNotFoundJson } from '@/lib/relayRepoError'

export function relayHostLabel(origin: string): string {
  if (!origin) return ''
  try {
    return new URL(origin).host || origin
  } catch {
    return origin
  }
}

/** Short node id from mirror origin (e.g. dfw1 from paradigm-threat-files.dfw1.relaygateway.net). */
export function relayNodeId(filesOrigin: string): string {
  if (!filesOrigin) return ''
  try {
    const host = new URL(filesOrigin).hostname
    const m = host.match(/^paradigm-threat-files\.([^.]+)\.relaygateway\.net$/i)
    if (m?.[1]) return m[1]
    const apex = host.match(/^([^.]+)\.relaygateway\.net$/i)
    if (apex?.[1]) return apex[1]
    return host
  } catch {
    return filesOrigin
  }
}

function hostDotLabels(host: string): string[] {
  return host.split('.').filter(Boolean)
}

/**
 * Shared server hostname for a mirror pair (e.g. dfw1.relaygateway.net).
 * Works for any domain: compares files + timeline hosts from the right;
 * falls back to files host without the leading repo label.
 */
export function relayServerHost(filesOrigin: string, timelineOrigin?: string): string {
  const filesHost = relayHostLabel(filesOrigin)
  if (!filesHost) return ''
  const timelineHost = timelineOrigin ? relayHostLabel(timelineOrigin) : ''
  if (!timelineHost || filesHost === timelineHost) {
    const parts = hostDotLabels(filesHost)
    return parts.length > 1 ? parts.slice(1).join('.') : filesHost
  }

  const filesLabels = hostDotLabels(filesHost)
  const timelineLabels = hostDotLabels(timelineHost)
  const shared: string[] = []
  const max = Math.min(filesLabels.length, timelineLabels.length)
  for (let i = 1; i <= max; i++) {
    const fl = filesLabels[filesLabels.length - i]!
    const tl = timelineLabels[timelineLabels.length - i]!
    if (fl !== tl) break
    shared.unshift(fl)
  }

  if (shared.length >= 2) return shared.join('.')

  const parts = hostDotLabels(filesHost)
  return parts.length > 1 ? parts.slice(1).join('.') : filesHost
}

export type RelayPairProbe = {
  latencyMs: number
  live: boolean
  filesOk: boolean
  timelineOk: boolean
}

export type RelayPairOption = {
  idx: number
  /** Full server host (e.g. dfw1.relaygateway.net), not repo subdomains. */
  serverHost: string
  latencyMs: number | null
  live: boolean
  filesOk: boolean
  timelineOk: boolean
  isActive: boolean
  statsLabel: string
}

export const RELAY_REPO_NAMES_LABEL = 'paradigm-threat-files · paradigm-threat-timeline'

function probeStatsLabel(filesOk: boolean, timelineOk: boolean): string {
  if (filesOk && timelineOk) return 'live'
  const parts: string[] = []
  if (filesOk) parts.push('files')
  if (timelineOk) parts.push('timeline')
  return parts.length > 0 ? parts.join(' · ') : 'offline'
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
      reason: 'index_failover' | 'md_failover' | 'timeline_md_failover' | 'manual_select'
      filesOrigin: string
      timelineOrigin: string
      serverLabel: string
    }

/** Dead mirrors must fail fast so dfw1 is not blocked on a retired-node TCP hang. */
const PROBE_TIMEOUT_MS = 2000
/** After a healthy peer wins, abort remaining probes so hkg1 cannot burn bandwidth during LCP. */
const PROBE_LOSER_ABORT_MS = 50
/** Delay before probing non-primary mirrors so iad1/sticky can win first paint. */
const PROBE_SECONDARY_DELAY_MS = 280
const MD_FETCH_TIMEOUT_MS = 12_000
/** Full catalog QUERY; keep below old 60s so slow mirrors failover sooner. */
const INDEX_FETCH_TIMEOUT_MS = 20_000

/** Persisted manual relay selection (survives refresh). Failover does not overwrite. */
const RELAY_PREFERRED_PAIR_KEY = 'paradigm-threat-relay-preferred-pair'
/** Last automatically healthy pair (MD/bootstrap). Used as sticky origin before probes finish. */
const RELAY_LAST_GOOD_PAIR_KEY = 'paradigm-threat-relay-last-good-pair'

function normalizeStoredOrigin(s: string): string {
  return s.trim().replace(/\/+$/, '')
}

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

type ProbeResult = {
  pair: RelayOriginPair
  bothOk: boolean
  scoreMs: number
  filesOk: boolean
  timelineOk: boolean
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

export type RemoteRelaySnapshot = {
  filesBaseUrl: string
  timelineBaseUrl: string
  relayBootstrapDone: boolean
  filesHostLabel: string
  timelineHostLabel: string
  serverLabel: string
}

class RemoteRelayStore {
  private pairs: RelayOriginPair[] = []
  private filesOrigin = ''
  private timelineOrigin = ''
  private bootstrapDone = false
  private bootstrapP: Promise<void> | null = null
  /** Filled during bootstrap probe (one request pair per server; reused by the selector UI). */
  private probeByIndex: Array<RelayPairProbe | undefined> = []
  private listeners = new Set<() => void>()
  private notifyListeners = new Set<(e: RelayNotifyEvent) => void>()
  /** Stable reference for useSyncExternalStore until emit() invalidates. */
  private snapshotCache: RemoteRelaySnapshot | null = null
  /** Aborts in-flight loser probes after the first healthy peer wins bootstrap. */
  private probeAbort: AbortController | null = null

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  subscribeNotify(cb: (e: RelayNotifyEvent) => void): () => void {
    this.notifyListeners.add(cb)
    return () => this.notifyListeners.delete(cb)
  }

  private emit(): void {
    this.snapshotCache = null
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
      // Prefer sticky last-good / manual preferred so page.md hits a fast peer before probes finish.
      // matchStoredPairKey must not call ensurePairs (would recurse).
      const sticky =
        this.matchStoredPairKey(RELAY_PREFERRED_PAIR_KEY) ??
        this.matchStoredPairKey(RELAY_LAST_GOOD_PAIR_KEY)
      const initial = sticky ?? this.pairs[0]!
      this.filesOrigin = initial.files
      this.timelineOrigin = initial.timeline
    }
  }

  /** Resolve a stored origin pair against `this.pairs` (caller must have set pairs). */
  private matchStoredPairKey(storageKey: string): RelayOriginPair | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { files?: unknown; timeline?: unknown }
      const files = rewriteRetiredRelayOrigin(
        typeof parsed.files === 'string' ? normalizeStoredOrigin(parsed.files) : '',
      )
      const timeline = rewriteRetiredRelayOrigin(
        typeof parsed.timeline === 'string' ? normalizeStoredOrigin(parsed.timeline) : '',
      )
      if (!files || !timeline) return null
      const match = this.pairs.find((pair) => pair.files === files && pair.timeline === timeline)
      if (match && (match.files !== parsed.files || match.timeline !== parsed.timeline)) {
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ files: match.files, timeline: match.timeline }),
          )
        } catch {
          /* ignore */
        }
      }
      return match ?? null
    } catch {
      return null
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
    reason: 'index_failover' | 'md_failover' | 'timeline_md_failover' | 'manual_select',
  ): void {
    const changed = p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin
    this.filesOrigin = p.files
    this.timelineOrigin = p.timeline
    if (reason === 'manual_select') {
      this.persistPreferredPair(p)
    }
    this.emit()
    if (changed) {
      this.emitNotify({
        type: 'switch',
        reason,
        filesOrigin: this.filesOrigin,
        timelineOrigin: this.timelineOrigin,
        serverLabel: relayServerHost(this.filesOrigin, this.timelineOrigin),
      })
    }
  }

  private finishBootstrap(p: RelayOriginPair): void {
    this.filesOrigin = p.files
    this.timelineOrigin = p.timeline
    this.bootstrapDone = true
    this.persistLastGoodPair(p)
    this.emit()
    this.emitNotify({
      type: 'ready',
      filesOrigin: this.filesOrigin,
      timelineOrigin: this.timelineOrigin,
      serverLabel: relayServerHost(this.filesOrigin, this.timelineOrigin),
    })
  }

  getSnapshot(): RemoteRelaySnapshot {
    if (this.snapshotCache) return this.snapshotCache
    this.ensurePairs()
    const fb = this.filesOrigin || this.pairs[0]?.files || ''
    const tb = this.timelineOrigin || this.pairs[0]?.timeline || ''
    this.snapshotCache = {
      filesBaseUrl: fb,
      timelineBaseUrl: tb,
      relayBootstrapDone: this.bootstrapDone,
      filesHostLabel: relayHostLabel(fb),
      timelineHostLabel: relayHostLabel(tb),
      serverLabel: relayServerHost(fb, tb),
    }
    return this.snapshotCache
  }

  /** Selector rows from last bootstrap probe (no extra network on open/select). */
  getRelayPairOptions(): RelayPairOption[] {
    this.ensurePairs()
    const activeIdx = this.getActivePairIndex()
    return this.pairs.map((_, idx) => {
      const probe = this.probeByIndex[idx]
      const live = probe?.live ?? false
      const latencyMs = probe ? probe.latencyMs : null
      const pair = this.pairs[idx]!
      return {
        idx,
        serverHost: relayServerHost(pair.files, pair.timeline) || `server-${idx + 1}`,
        latencyMs,
        live,
        filesOk: probe?.filesOk ?? false,
        timelineOk: probe?.timelineOk ?? false,
        isActive: idx === activeIdx,
        statsLabel: probe ? probeStatsLabel(probe.filesOk, probe.timelineOk) : '…',
      }
    })
  }

  /** Stable string for useSyncExternalStore subscriptions. */
  getRelayPairOptionsKey(): string {
    const snap = this.getSnapshot()
    return this.getRelayPairOptions()
      .map(
        (o) =>
          `${o.idx}:${o.serverHost}:${o.latencyMs ?? 'x'}:${o.live ? 1 : 0}:${o.isActive ? 1 : 0}:${o.statsLabel}`,
      )
      .join('|') + `|b${snap.relayBootstrapDone ? 1 : 0}`
  }

  getRelayPairs(): RelayOriginPair[] {
    this.ensurePairs()
    return [...this.pairs]
  }

  getActivePairIndex(): number {
    this.ensurePairs()
    const idx = this.pairs.findIndex((p) => p.files === this.filesOrigin && p.timeline === this.timelineOrigin)
    return idx >= 0 ? idx : 0
  }

  setActivePairIndex(index: number): boolean {
    this.ensurePairs()
    if (!Number.isInteger(index) || index < 0 || index >= this.pairs.length) return false
    const pair = this.pairs[index]
    if (!pair) return false
    this.switchToPair(pair, 'manual_select')
    this.warmFilesCatalog(pair.files)
    return true
  }

  async bootstrap(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.bootstrapP) return this.bootstrapP
    this.bootstrapP = this.runBootstrap()
    return this.bootstrapP
  }

  private async probePair(p: RelayOriginPair, parentSignal?: AbortSignal): Promise<ProbeResult> {
    const start = t0()
    let filesOk = false
    let timelineOk = false
    try {
      const signal = parentSignal
        ? mergeAbort(parentSignal, PROBE_TIMEOUT_MS)
        : AbortSignal.timeout(PROBE_TIMEOUT_MS)
      const headers = {
        'content-type': 'application/json',
        accept: 'application/json',
      }
      const [rf, rt] = await Promise.all([
        fetch(`${p.files.replace(/\/$/, '')}/`, {
          method: 'QUERY',
          headers,
          body: JSON.stringify({ collection: 'index', query: '', limit: 1 }),
          cache: 'no-store',
          signal,
        }),
        fetch(`${p.timeline.replace(/\/$/, '')}/`, {
          method: 'QUERY',
          headers,
          body: JSON.stringify({ collection: 'events', query: '', limit: 1 }),
          cache: 'no-store',
          signal,
        }),
      ])
      if (rf.ok) {
        try {
          const { catalogEnvelopeHasPaths } = await import('@/lib/filesCatalogCache')
          const body = (await rf.json()) as { results?: unknown[]; docCount?: unknown }
          filesOk = catalogEnvelopeHasPaths(body)
        } catch {
          filesOk = false
        }
      }
      timelineOk = rt.ok
    } catch {
      /* leave flags false (timeout / abort / network) */
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

  private readStoredPreferredPair(): RelayOriginPair | null {
    this.ensurePairs()
    return this.matchStoredPairKey(RELAY_PREFERRED_PAIR_KEY)
  }

  private persistPreferredPair(p: RelayOriginPair): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        RELAY_PREFERRED_PAIR_KEY,
        JSON.stringify({ files: p.files, timeline: p.timeline }),
      )
    } catch {
      /* quota / private mode */
    }
  }

  private readStoredLastGoodPair(): RelayOriginPair | null {
    this.ensurePairs()
    return this.matchStoredPairKey(RELAY_LAST_GOOD_PAIR_KEY)
  }

  private persistLastGoodPair(p: RelayOriginPair): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        RELAY_LAST_GOOD_PAIR_KEY,
        JSON.stringify({ files: p.files, timeline: p.timeline }),
      )
    } catch {
      /* quota / private mode */
    }
  }

  private pickBestFromProbeResults(results: ProbeResult[]): RelayOriginPair {
    const dual = results.filter((r) => r.bothOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (dual.length > 0) return pickRandomAmongNearBest(dual)

    const filesOnly = results.filter((r) => r.filesOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (filesOnly.length > 0) return pickRandomAmongNearBest(filesOnly)

    const timelineOnly = results.filter((r) => r.timelineOk).sort((a, b) => a.scoreMs - b.scoreMs)
    if (timelineOnly.length > 0) return pickRandomAmongNearBest(timelineOnly)

    return this.pairs[0]!
  }

  private writeProbeAt(idx: number, r: ProbeResult): void {
    const next = this.probeByIndex.slice()
    next[idx] = {
      latencyMs: Math.round(r.scoreMs),
      live: r.bothOk,
      filesOk: r.filesOk,
      timelineOk: r.timelineOk,
    }
    this.probeByIndex = next
    this.emit()
  }

  /** Kick off full files catalog QUERY in parallel with probes (deduped via filesCatalogCache). */
  private warmFilesCatalog (filesOrigin: string): void {
    if (typeof window === 'undefined' || !filesOrigin) return
    void this.fetchFilesCatalogForOrigin(filesOrigin, AbortSignal.timeout(INDEX_FETCH_TIMEOUT_MS))
  }

  /**
   * Race pair probes with a fast-path bias: sticky last-good / preferred / env-first
   * (iad1) is provisional immediately and probed first. Secondary mirrors start after a
   * short delay so a slow hkg1 probe cannot compete with first paint. First healthy
   * pair wins; remaining probes are aborted. Preferred does not block a faster peer.
   */
  private async runBootstrap(): Promise<void> {
    this.ensurePairs()
    if (this.pairs.length === 0) {
      this.bootstrapDone = true
      this.emit()
      return
    }

    const preferredEarly = this.readStoredPreferredPair()
    const lastGood = this.readStoredLastGoodPair()
    // Seed origin before probes so page.md can race the first peer immediately.
    // Do not warm the full catalog here — it races page.md for bandwidth (LCP).
    const seed = preferredEarly ?? lastGood ?? this.pairs[0]!
    if (seed.files !== this.filesOrigin || seed.timeline !== this.timelineOrigin) {
      this.filesOrigin = seed.files
      this.timelineOrigin = seed.timeline
      this.emit()
    }

    this.probeAbort?.abort()
    this.probeAbort = new AbortController()
    const probeSignal = this.probeAbort.signal

    await new Promise<void>((resolve) => {
      let settled = false
      const results: Array<ProbeResult | undefined> = new Array(this.pairs.length)

      const finish = (p: RelayOriginPair) => {
        if (settled) return
        settled = true
        // Abort loser probes shortly after win so slow mirrors stop competing with page.md.
        window.setTimeout(() => this.probeAbort?.abort(), PROBE_LOSER_ABORT_MS)
        this.finishBootstrap(p)
        resolve()
      }

      const consider = (r: ProbeResult) => {
        if (settled || !r.bothOk) return
        finish(r.pair)
      }

      const primaryIdx = Math.max(
        0,
        this.pairs.findIndex((p) => p.files === seed.files && p.timeline === seed.timeline),
      )

      const runOne = async (idx: number) => {
        if (settled || probeSignal.aborted) return
        const p = this.pairs[idx]!
        const r = await this.probePair(p, probeSignal)
        results[idx] = r
        this.writeProbeAt(idx, r)
        consider(r)
      }

      void runOne(primaryIdx)

      const secondaryIdxs = this.pairs.map((_, idx) => idx).filter((idx) => idx !== primaryIdx)
      if (secondaryIdxs.length > 0) {
        window.setTimeout(() => {
          if (settled || probeSignal.aborted) return
          for (const idx of secondaryIdxs) void runOne(idx)
        }, PROBE_SECONDARY_DELAY_MS)
      }

      void (async () => {
        // Wait until every slot has a result or bootstrap settled / aborted.
        const deadline = Date.now() + PROBE_TIMEOUT_MS + PROBE_SECONDARY_DELAY_MS + 500
        while (!settled && Date.now() < deadline) {
          if (results.every((r) => r != null) || probeSignal.aborted) break
          await new Promise((r) => setTimeout(r, 40))
        }
        if (settled) return
        const filled = results.filter((r): r is ProbeResult => r != null)
        if (filled.length > 0) {
          finish(this.pickBestFromProbeResults(filled))
        } else {
          finish(seed)
        }
      })()
    })
  }

  /**
   * QUERY the files mirror (default collection index). Failover across pairs.
   */
  async queryFiles (
    opts: {
      collection?: string
      query?: string | Record<string, unknown>
      limit?: number
      order?: import('@/lib/relayQuery').RelayQueryOrder
      signal?: AbortSignal
    } = {},
  ): Promise<import('@/lib/relayQuery').RelayQueryEnvelope> {
    const { queryRelayOrigin } = await import('@/lib/relayQuery')
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    const failures: string[] = []
    for (const p of order) {
      if (opts.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
      }
      const signal = opts.signal
        ? mergeAbort(opts.signal, INDEX_FETCH_TIMEOUT_MS)
        : AbortSignal.timeout(INDEX_FETCH_TIMEOUT_MS)
      try {
        const data = await queryRelayOrigin(p.files, {
          collection: opts.collection ?? 'index',
          query: opts.query ?? '',
          limit: opts.limit ?? 10_000,
          order: opts.order,
          signal,
        })
        if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
          this.switchToPair(p, 'index_failover')
        }
        return data
      } catch (e) {
        if (opts.signal?.aborted) {
          throw e instanceof Error ? e : new DOMException('The operation was aborted.', 'AbortError')
        }
        const msg = e instanceof Error ? e.message : String(e)
        const name = e instanceof Error ? e.name : ''
        const detail = name === 'TimeoutError' || /timed? ?out/i.test(msg)
          ? `timeout after ${INDEX_FETCH_TIMEOUT_MS / 1000}s`
          : msg
        failures.push(`${p.files} (${detail})`)
      }
    }
    const summary = failures.length
      ? `All files mirrors failed: ${failures.join('; ')}`
      : 'All files mirrors failed'
    console.warn('[remoteRelay] queryFiles:', summary)
    throw new Error(summary)
  }

  /**
   * QUERY the timeline mirror. Failover across pairs.
   */
  async queryTimeline (
    opts: {
      collection?: string
      query?: string | Record<string, unknown>
      limit?: number
      order?: import('@/lib/relayQuery').RelayQueryOrder
      signal?: AbortSignal
    } = {},
  ): Promise<import('@/lib/relayQuery').RelayQueryEnvelope | null> {
    const { queryRelayOrigin } = await import('@/lib/relayQuery')
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    let lastErr: Error | null = null
    for (const p of order) {
      const signal = opts.signal
        ? mergeAbort(opts.signal, INDEX_FETCH_TIMEOUT_MS)
        : AbortSignal.timeout(INDEX_FETCH_TIMEOUT_MS)
      try {
        const data = await queryRelayOrigin(p.timeline, {
          collection: opts.collection ?? 'events',
          query: opts.query ?? '',
          limit: opts.limit ?? 10_000,
          order: opts.order ?? 'sort_key',
          signal,
        })
        if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
          this.switchToPair(p, 'index_failover')
        }
        return data
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
      }
    }
    if (lastErr) console.warn('[remoteRelay] queryTimeline:', lastErr.message)
    return null
  }

  /**
   * Load files catalog via QUERY and rebuild nested tree.
   * Uses session cache + inflight dedupe shared with search.
   */
  async fetchFilesCatalog (externalAbort: AbortSignal): Promise<unknown | null> {
    this.ensurePairs()
    void this.bootstrap()
    const origin = this.filesOrigin || this.pairs[0]?.files || ''
    if (!origin) return null
    return this.fetchFilesCatalogForOrigin(origin, externalAbort)
  }

  private async fetchFilesCatalogForOrigin (
    filesOrigin: string,
    externalAbort: AbortSignal,
  ): Promise<unknown | null> {
    const {
      getCachedFilesCatalogTree,
      loadFilesCatalogCached,
      rememberFilesCatalogFromEnvelope,
    } = await import('@/lib/filesCatalogCache')
    const hit = getCachedFilesCatalogTree(filesOrigin)
    if (hit) return hit

    return loadFilesCatalogCached(filesOrigin, async () => {
      // Prefer the warmed origin first, then normal failover order.
      const { queryRelayOrigin } = await import('@/lib/relayQuery')
      const { catalogEnvelopeHasPaths } = await import('@/lib/filesCatalogCache')
      this.ensurePairs()
      const order = this.pairFailoverOrder()
      const preferred = order.find((p) => p.files === filesOrigin)
      const tryOrder = preferred ? [preferred, ...order.filter((p) => p !== preferred)] : order
      let lastErr: Error | null = null
      for (const p of tryOrder) {
        const signal = mergeAbort(externalAbort, INDEX_FETCH_TIMEOUT_MS)
        try {
          const data = await queryRelayOrigin(p.files, {
            collection: 'index',
            query: '',
            limit: 10_000,
            signal,
          })
          // Empty-but-OK catalogs (reindex lag / wiped sqlite) must not block failover.
          if (!catalogEnvelopeHasPaths(data)) {
            lastErr = new Error(`QUERY empty catalog ${p.files}`)
            continue
          }
          if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
            this.switchToPair(p, 'index_failover')
          }
          if (p.files !== filesOrigin) {
            rememberFilesCatalogFromEnvelope(p.files, data)
          }
          return data
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }
      if (lastErr) console.warn('[remoteRelay] fetchFilesCatalogForOrigin:', lastErr.message)
      return null
    })
  }

  /**
   * Load site-claims.json from the active pair, then other pairs on timeout/error.
   */
  async fetchSiteClaimsJson(externalAbort: AbortSignal): Promise<unknown | null> {
    this.ensurePairs()
    const order = this.pairFailoverOrder()
    let lastErr: Error | null = null
    for (const p of order) {
      const v = Math.floor(Date.now() / 60000)
      const url = `${p.files.replace(/\/$/, '')}/site-claims.json?v=${v}`
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
    if (lastErr) console.warn('[remoteRelay] fetchSiteClaimsJson:', lastErr.message)
    return null
  }

  /**
   * Fetch markdown for a site URL path (tries path.md, path/page.md, etc.); on timeout/error try other pairs.
   * Does not wait for full-catalog QUERY or probe completion — homepage page.md can paint first.
   */
  async fetchFilesMdResolved (
    logicalPath: string,
    versionQuery: string,
    externalAbort: AbortSignal,
  ): Promise<{ body: string; relPath: string }> {
    const hit = await this.tryFetchFilesMd(logicalPath, versionQuery, externalAbort)
    if (hit) return hit

    this.ensurePairs()
    const order = this.pairFailoverOrder()
    const err = new Error('All relay pairs failed for files MD')
    const summary = order.map((p) => relayHostLabel(p.files)).join(', ')
    sendClientTelemetry({
      kind: 'mirror_md_failed',
      mirrorPhase: 'files_md',
      message: err.message.slice(0, 500),
      mirrorResourcePath: logicalPath.replace(/^\//, '').slice(0, 200),
      attemptedHostCount: order.length,
      attemptedHostsSummary: summary.slice(0, 200),
    })
    throw err
  }

  async fetchFilesMd (logicalPath: string, versionQuery: string, externalAbort: AbortSignal): Promise<Response> {
    const { body, relPath: _relPath } = await this.fetchFilesMdResolved(logicalPath, versionQuery, externalAbort)
    return new Response(body, { status: 200, statusText: 'OK' })
  }

  private async tryFetchFilesMd (
    logicalPath: string,
    versionQuery: string,
    externalAbort: AbortSignal,
  ): Promise<{ body: string; relPath: string } | null> {
    this.ensurePairs()
    void this.bootstrap()
    const order = this.pairFailoverOrder()
    const candidates = buildArticleMdCandidatePaths(logicalPath)
    let lastErr: Error | null = null
    for (const relPath of candidates) {
      for (const p of order) {
        const base = p.files
        const url = `${base.replace(/\/$/, '')}/${relPath.replace(/^\//, '')}${versionQuery}`
        const signal = mergeAbort(externalAbort, MD_FETCH_TIMEOUT_MS)
        try {
          const res = await fetch(url, { signal })
          if (!res.ok) continue
          const body = await res.text()
          if (isRelayRepoNotFoundJson(body)) continue
          if (p.files !== this.filesOrigin || p.timeline !== this.timelineOrigin) {
            this.switchToPair(p, 'md_failover')
          }
          this.persistLastGoodPair(p)
          return { body, relPath }
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }
    }
    if (lastErr) throw lastErr
    return null
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
