/**
 * Server-side Piper helpers (tests, legacy imports). Prefer **piperClient** in the browser.
 */

import {
  getServerPiperApiBaseUrls,
  getServerPiperApiSecret,
} from '@/lib/tts/piperBases'

export {
  getServerPiperApiBaseUrls as getPiperApiBaseUrls,
  getServerPiperApiSecret as getPiperApiSecret,
}

export function isPiperConfigured (): boolean {
  return getServerPiperApiBaseUrls().length > 0
}

export function piperAuthHeaders (): Record<string, string> {
  const secret = getServerPiperApiSecret()
  if (!secret) return {}
  return { Authorization: `Bearer ${secret}` }
}

function shouldFailoverToNextHost (status: number): boolean {
  return status === 429 || status >= 500
}

export async function fetchPiperTtsUpstream (
  body: Record<string, unknown>,
  timeoutMs = 28_000,
): Promise<Response> {
  const bases = getServerPiperApiBaseUrls()
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

export async function aggregatePiperVoices (
  timeoutMs = 15_000,
): Promise<PiperVoicesPayload> {
  const bases = getServerPiperApiBaseUrls()
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
