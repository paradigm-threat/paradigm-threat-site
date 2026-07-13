/**
 * Relay QUERY HTTP client (SQLite FTS). Always send Accept: application/json.
 */

export type RelayQueryEnvelope = {
  results: Record<string, unknown>[]
  collection: string
  query: unknown
  count: number
  docCount: number
  indexedHead?: string
  tipHead?: string
  indexFresh?: boolean
  tookMs?: number
  status: string
}

export type RelayQueryRequest = {
  collection?: string
  query?: string | Record<string, unknown>
  limit?: number
  signal?: AbortSignal
  /** Auxiliary branch (e.g. `chat/public`) until Host `--branch-slug` routing ships. */
  branch?: string
}

export async function queryRelayOrigin (
  origin: string,
  req: RelayQueryRequest,
): Promise<RelayQueryEnvelope> {
  const base = origin.replace(/\/$/, '')
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (req.branch?.trim()) {
    headers['X-Relay-Branch'] = req.branch.trim()
  }
  const res = await fetch(base + '/', {
    method: 'QUERY',
    headers,
    body: JSON.stringify({
      collection: req.collection ?? 'index',
      query: req.query ?? '',
      limit: req.limit ?? 50,
    }),
    signal: req.signal,
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`QUERY ${res.status} ${base}`)
  }
  const data = (await res.json()) as RelayQueryEnvelope
  if (data.status === 'not_indexed') {
    throw new Error(`QUERY not_indexed ${base}`)
  }
  if (!Array.isArray(data.results)) {
    throw new Error(`QUERY invalid envelope ${base}`)
  }
  return data
}
