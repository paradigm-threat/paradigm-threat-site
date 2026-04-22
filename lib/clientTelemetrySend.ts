/**
 * Browser-only beacon to /api/client-telemetry. Throttled per-kind + session cap (privacy + spam control).
 */
import type { ClientTelemetryPayload } from '@/lib/clientTelemetryTypes'

const THROTTLE_MS = 60_000
const SESSION_COUNT_KEY = 'pt_telemetry_session_count'
const MAX_EVENTS_PER_SESSION = 20

function pathnameOnly (): string {
  if (typeof window === 'undefined') return ''
  try {
    const p = window.location.pathname || '/'
    return p.length > 512 ? p.slice(0, 512) : p
  } catch {
    return '/'
  }
}

function throttleAllows (kind: string): boolean {
  try {
    const key = `pt_telemetry_last_${kind}`
    const now = Date.now()
    const last = Number(sessionStorage.getItem(key) || '0')
    if (now - last < THROTTLE_MS) return false
    sessionStorage.setItem(key, String(now))

    const n = Number(sessionStorage.getItem(SESSION_COUNT_KEY) || '0')
    if (n >= MAX_EVENTS_PER_SESSION) return false
    sessionStorage.setItem(SESSION_COUNT_KEY, String(n + 1))
    return true
  } catch {
    return true
  }
}

/**
 * Sends one telemetry event (same-origin). Safe to call from client code; no-ops on server.
 */
export function sendClientTelemetry (partial: Omit<ClientTelemetryPayload, 'pathname'> & { pathname?: string }): void {
  if (typeof window === 'undefined') return
  if (!throttleAllows(partial.kind)) return

  const pathname = partial.pathname ?? pathnameOnly()
  const payload: ClientTelemetryPayload = {
    ...partial,
    pathname,
  }

  const body = JSON.stringify(payload)
  void fetch('/api/client-telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* ignore */
  })
}
