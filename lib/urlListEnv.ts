/**
 * Multi-origin env vars use whitespace (space, tab, newline) as delimiter.
 * Example: https://a.example https://b.example
 */

const DEFAULT_FILES_ORIGIN = 'https://paradigm-threat-files-69f9dc.gitlab.io'
const DEFAULT_TIMELINE_ORIGIN = 'https://paradigm-threat-timeline-a77fe2.gitlab.io'

/** Recycled Spot nodes — rewrite so stale env / localStorage cannot probe a dead host. */
const RETIRED_RELAY_HOST_REWRITES: Array<[RegExp, string]> = [
  [/lon1\.relaygateway\.net/gi, 'iad1.relaygateway.net'],
  [/dfw1\.relaygateway\.net/gi, 'iad1.relaygateway.net'],
]

export function rewriteRetiredRelayOrigin (origin: string): string {
  let next = origin
  for (const [re, to] of RETIRED_RELAY_HOST_REWRITES) {
    next = next.replace(re, to)
  }
  return next
}

function normalizeOrigin(s: string): string {
  return rewriteRetiredRelayOrigin(s.trim()).replace(/\/+$/, '')
}

function dedupeOrigins (list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const n = normalizeOrigin(raw)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/** Split on whitespace (space, tab, newline), trim, drop empties, strip trailing slashes. */
export function parseUrlList(raw: string | undefined, fallback?: string): string[] {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) {
    return fallback ? [normalizeOrigin(fallback)] : []
  }
  const parts = trimmed
    .split(/\s+/)
    .map((s) => normalizeOrigin(s))
    .filter(Boolean)
  return parts.length > 0 ? dedupeOrigins(parts) : fallback ? [normalizeOrigin(fallback)] : []
}

export interface RelayOriginPair {
  files: string
  timeline: string
}

/**
 * Shared node host for pairing files + timeline (e.g. iad1.relaygateway.net).
 * Strips the leading repo label so list order cannot zip iad1 files with hkg1 timeline.
 */
export function relayPairNodeKey(origin: string): string {
  try {
    const host = new URL(origin).hostname.toLowerCase()
    const parts = host.split('.').filter(Boolean)
    if (parts.length >= 3) return parts.slice(1).join('.')
    return host
  } catch {
    return normalizeOrigin(origin)
  }
}

/**
 * Pair files and timeline origins by node hostname when both lists share a node
 * (`iad1` / `hkg1`). Unmatched leftovers zip by remaining order; a shorter
 * leftover list reuses its last entry. Order follows the files list.
 */
export function zipRelayPairs(files: string[], timeline: string[]): RelayOriginPair[] {
  const fList = files.map(normalizeOrigin).filter(Boolean)
  const tList = timeline.map(normalizeOrigin).filter(Boolean)
  if (fList.length === 0 && tList.length === 0) {
    return [
      { files: normalizeOrigin(DEFAULT_FILES_ORIGIN), timeline: normalizeOrigin(DEFAULT_TIMELINE_ORIGIN) },
    ]
  }
  const filesOrDefault = fList.length > 0 ? fList : [normalizeOrigin(DEFAULT_FILES_ORIGIN)]
  const timelineOrDefault = tList.length > 0 ? tList : [normalizeOrigin(DEFAULT_TIMELINE_ORIGIN)]

  const tByKey = new Map<string, string[]>()
  for (const t of timelineOrDefault) {
    const k = relayPairNodeKey(t)
    const arr = tByKey.get(k) ?? []
    arr.push(t)
    tByKey.set(k, arr)
  }

  const out: RelayOriginPair[] = []
  const usedT = new Set<string>()
  const unpairedF: string[] = []
  for (const f of filesOrDefault) {
    const k = relayPairNodeKey(f)
    const t = (tByKey.get(k) ?? []).find((x) => !usedT.has(x))
    if (t) {
      usedT.add(t)
      out.push({ files: f, timeline: t })
    } else {
      unpairedF.push(f)
    }
  }

  const unpairedT = timelineOrDefault.filter((t) => !usedT.has(t))
  if (unpairedF.length > 0 && unpairedT.length > 0) {
    const n = Math.max(unpairedF.length, unpairedT.length)
    for (let i = 0; i < n; i++) {
      const f = unpairedF[Math.min(i, unpairedF.length - 1)]!
      const t = unpairedT[Math.min(i, unpairedT.length - 1)]!
      out.push({ files: f, timeline: t })
    }
  } else if (unpairedF.length > 0) {
    const tFallback = timelineOrDefault[timelineOrDefault.length - 1]!
    for (const f of unpairedF) out.push({ files: f, timeline: tFallback })
  } else if (unpairedT.length > 0) {
    const fFallback = filesOrDefault[filesOrDefault.length - 1]!
    for (const t of unpairedT) out.push({ files: fFallback, timeline: t })
  }

  return out
}

export function getFilesBaseUrlList(): string[] {
  return parseUrlList(process.env.NEXT_PUBLIC_FILES_BASE_URL, DEFAULT_FILES_ORIGIN)
}

export function getPrimaryFilesBaseUrl(): string {
  return getFilesBaseUrlList()[0] || DEFAULT_FILES_ORIGIN
}

export function getTimelineBaseUrlList(): string[] {
  return parseUrlList(process.env.NEXT_PUBLIC_TIMELINE_BASE_URL, DEFAULT_TIMELINE_ORIGIN)
}

export function getPrimaryTimelineBaseUrl(): string {
  return getTimelineBaseUrlList()[0] || DEFAULT_TIMELINE_ORIGIN
}
