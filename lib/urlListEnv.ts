/**
 * Multi-origin env vars use whitespace (space, tab, newline) as delimiter.
 * Example: https://a.example https://b.example
 */

const DEFAULT_FILES_ORIGIN = 'https://paradigm-threat-files-69f9dc.gitlab.io'
const DEFAULT_TIMELINE_ORIGIN = 'https://paradigm-threat-timeline-a77fe2.gitlab.io'

function normalizeOrigin(s: string): string {
  return s.trim().replace(/\/+$/, '')
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
  return parts.length > 0 ? parts : fallback ? [normalizeOrigin(fallback)] : []
}

export interface RelayOriginPair {
  files: string
  timeline: string
}

/**
 * Zip files and timeline URL lists by index (relay node i). Shorter list reuses its last entry.
 * Used so one “fastest pair” probe selects both origins together.
 */
export function zipRelayPairs(files: string[], timeline: string[]): RelayOriginPair[] {
  const nf = files.length
  const nt = timeline.length
  if (nf === 0 && nt === 0) {
    return [
      { files: normalizeOrigin(DEFAULT_FILES_ORIGIN), timeline: normalizeOrigin(DEFAULT_TIMELINE_ORIGIN) },
    ]
  }
  const n = Math.max(nf || 1, nt || 1)
  const out: RelayOriginPair[] = []
  for (let i = 0; i < n; i++) {
    const fi = nf === 0 ? 0 : Math.min(i, nf - 1)
    const ti = nt === 0 ? 0 : Math.min(i, nt - 1)
    const f = (nf > 0 ? files[fi] : DEFAULT_FILES_ORIGIN) || DEFAULT_FILES_ORIGIN
    const t = (nt > 0 ? timeline[ti] : DEFAULT_TIMELINE_ORIGIN) || DEFAULT_TIMELINE_ORIGIN
    out.push({ files: normalizeOrigin(f), timeline: normalizeOrigin(t) })
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
