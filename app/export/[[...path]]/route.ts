import { NextResponse } from 'next/server'
import { getTimelineOrigins } from '@/lib/timelineOrigins'

export const dynamic = 'force-dynamic'

const FETCH_TIMEOUT_MS = 45_000

const PROXY_HEADER_ALLOW = new Set([
  'content-type',
  'content-disposition',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
])

function buildExportPath (segments: string[]): string {
  if (!segments.length) return '/export'
  return '/export/' + segments.map((s) => encodeURIComponent(s)).join('/')
}

function assertSafeSegments (segments: string[]): string | null {
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..' || seg.includes('/') || seg.includes('\\')) {
      return 'Invalid path'
    }
  }
  return null
}

function filterUpstreamHeaders (upstream: Headers): Headers {
  const out = new Headers()
  upstream.forEach((value, key) => {
    const k = key.toLowerCase()
    if (PROXY_HEADER_ALLOW.has(k)) {
      out.set(key, value)
    }
  })
  return out
}

async function fetchFromOrigins (
  search: string,
  exportPath: string,
  method: 'GET' | 'HEAD'
): Promise<Response | null> {
  const origins = getTimelineOrigins()
  if (!origins.length) return null

  for (const origin of origins) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    try {
      const url = `${origin}${exportPath}${search}`
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ac.signal,
        headers: {
          'Accept-Encoding': 'identity',
        },
      })
      if (res.ok) {
        return res
      }
    } catch {
      // try next origin
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}

export async function GET (
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const bad = assertSafeSegments(segments)
  if (bad) {
    return new NextResponse(bad, { status: 400 })
  }
  if (!segments.length) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const exportPath = buildExportPath(segments)
  const search = new URL(request.url).search
  const upstream = await fetchFromOrigins(search, exportPath, 'GET')
  if (!upstream) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const headers = filterUpstreamHeaders(upstream.headers)
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}

export async function HEAD (
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const bad = assertSafeSegments(segments)
  if (bad) {
    return new NextResponse(null, { status: 400 })
  }
  if (!segments.length) {
    return new NextResponse(null, { status: 404 })
  }

  const exportPath = buildExportPath(segments)
  const search = new URL(request.url).search
  const upstream = await fetchFromOrigins(search, exportPath, 'HEAD')
  if (!upstream) {
    return new NextResponse(null, { status: 404 })
  }

  const headers = filterUpstreamHeaders(upstream.headers)
  return new NextResponse(null, {
    status: upstream.status,
    headers,
  })
}
