/**
 * Multi-host Piper / clevertree-tts upstream: failover on synthesis, merge voice lists.
 *
 * Env:
 *   PIPER_API_URLS — whitespace-separated base URLs (no trailing slash), e.g.
 *     http://host:5590 https://other.example.com
 *   PIPER_API_URL — optional legacy single host (used when PIPER_API_URLS is empty)
 *   PIPER_API_SECRET — optional Bearer token for all hosts (same as .env.local / Vercel)
 */

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

export function getPiperApiBaseUrls(): string[] {
  const listRaw = (process.env.PIPER_API_URLS ?? '').trim()
  const fromList = listRaw
    .split(/\s+/)
    .map((s) => normalizeBaseUrl(s))
    .filter(Boolean)
  if (fromList.length > 0) return fromList

  const single = normalizeBaseUrl(process.env.PIPER_API_URL ?? '')
  return single ? [single] : []
}

export function getPiperApiSecret(): string {
  return process.env.PIPER_API_SECRET ?? ''
}

export function isPiperConfigured(): boolean {
  return getPiperApiBaseUrls().length > 0
}

export function piperAuthHeaders(): Record<string, string> {
  const secret = getPiperApiSecret()
  if (!secret) return {}
  return { Authorization: `Bearer ${secret}` }
}

/** Retry next host on timeout, network error, 429, or 5xx */
function shouldFailoverToNextHost(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * POST /tts on each base until success. Does not failover on 4xx (except 429).
 * @throws Error when every host fails with a thrown error (no HTTP response to return)
 */
export async function fetchPiperTtsUpstream(
  body: Record<string, unknown>,
  timeoutMs = 28_000,
): Promise<Response> {
  const bases = getPiperApiBaseUrls()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...piperAuthHeaders(),
  }
  const payload = JSON.stringify(body)

  let lastResponse: Response | undefined
  let lastThrown: unknown

  for (const base of bases) {
    const url = `${base}/tts`
    const signal = AbortSignal.timeout(timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal,
      })
      if (res.ok) return res
      lastResponse = res
      if (!shouldFailoverToNextHost(res.status)) return res
    } catch (e) {
      lastThrown = e
      console.warn(
        `[TTS] upstream ${url} failed:`,
        e instanceof Error ? e.message : e,
      )
    }
  }

  if (lastResponse) return lastResponse
  const msg =
    lastThrown instanceof Error ? lastThrown.message : String(lastThrown ?? 'unknown')
  throw new Error(`All Piper TTS upstreams failed: ${msg}`)
}

export interface PiperVoicesPayload {
  voices: unknown[]
  defaultVoiceId: string | null
}

/**
 * Query /voices on each base; merge voices by `id` (first wins); first non-null defaultVoiceId wins.
 */
export async function aggregatePiperVoices(timeoutMs = 15_000): Promise<PiperVoicesPayload> {
  const bases = getPiperApiBaseUrls()
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    ...piperAuthHeaders(),
  }
  const byId = new Map<string, unknown>()
  let defaultVoiceId: string | null = null

  for (const base of bases) {
    const url = `${base}/voices`
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        console.error(`[TTS VOICES] ${url} returned ${res.status}`)
        continue
      }
      const data = (await res.json()) as {
        voices?: unknown[]
        defaultVoiceId?: string | null
      }
      const voices = Array.isArray(data.voices) ? data.voices : []
      if (defaultVoiceId == null && data.defaultVoiceId != null) {
        defaultVoiceId =
          typeof data.defaultVoiceId === 'string' ? data.defaultVoiceId : null
      }
      for (const v of voices) {
        if (
          v &&
          typeof v === 'object' &&
          'id' in v &&
          typeof (v as { id: unknown }).id === 'string'
        ) {
          const id = (v as { id: string }).id
          if (!byId.has(id)) byId.set(id, v)
        }
      }
    } catch (e) {
      console.warn(
        `[TTS VOICES] ${url}:`,
        e instanceof Error ? e.message : e,
      )
    }
  }

  return { voices: Array.from(byId.values()), defaultVoiceId }
}
