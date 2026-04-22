import { NextRequest, NextResponse } from 'next/server'
import {
  CLIENT_TELEMETRY_KINDS,
  type ClientTelemetryKind,
  CLIENT_TELEMETRY_MAX_BODY_BYTES,
  CLIENT_TELEMETRY_MAX_HOSTS_SUMMARY,
  CLIENT_TELEMETRY_MAX_MESSAGE,
  CLIENT_TELEMETRY_MAX_PATHNAME,
  CLIENT_TELEMETRY_MAX_RESOURCE_PATH,
} from '@/lib/clientTelemetryTypes'

function isKind (v: unknown): v is ClientTelemetryKind {
  return typeof v === 'string' && (CLIENT_TELEMETRY_KINDS as readonly string[]).includes(v)
}

function trunc (s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

/**
 * Ingests lightweight client diagnostics (mirror failures, uncaught errors) for Vercel Runtime Logs.
 * Privacy: pathname only, truncated strings, no cookies forwarded.
 */
export async function POST (req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > CLIENT_TELEMETRY_MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'body too large' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
    }

    if (body === null || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })
    }

    const o = body as Record<string, unknown>
    if (!isKind(o.kind)) {
      return NextResponse.json({ ok: false, error: 'invalid kind' }, { status: 400 })
    }

    const pathname =
      typeof o.pathname === 'string' ? trunc(o.pathname, CLIENT_TELEMETRY_MAX_PATHNAME) : ''
    const message =
      typeof o.message === 'string' ? trunc(o.message, CLIENT_TELEMETRY_MAX_MESSAGE) : undefined
    const mirrorPhase = typeof o.mirrorPhase === 'string' ? trunc(o.mirrorPhase, 64) : undefined
    const attemptedHostCount =
      typeof o.attemptedHostCount === 'number' && Number.isFinite(o.attemptedHostCount)
        ? Math.min(99, Math.max(0, Math.floor(o.attemptedHostCount)))
        : undefined
    const attemptedHostsSummary =
      typeof o.attemptedHostsSummary === 'string'
        ? trunc(o.attemptedHostsSummary, CLIENT_TELEMETRY_MAX_HOSTS_SUMMARY)
        : undefined
    const mirrorResourcePath =
      typeof o.mirrorResourcePath === 'string'
        ? trunc(o.mirrorResourcePath, CLIENT_TELEMETRY_MAX_RESOURCE_PATH)
        : undefined
    const digest = typeof o.digest === 'string' ? trunc(o.digest, 64) : undefined

    const ua = req.headers.get('user-agent')
    const uaShort = ua ? trunc(ua, 200) : undefined

    const logLine = {
      kind: o.kind,
      pathname,
      message,
      mirrorPhase,
      attemptedHostCount,
      attemptedHostsSummary,
      mirrorResourcePath,
      digest,
      userAgent: uaShort,
    }

    console.error('[client-telemetry]', JSON.stringify(logLine))

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('[client-telemetry] handler error', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
