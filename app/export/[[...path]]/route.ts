import { NextResponse } from 'next/server'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import {
  assertSafePathSegments,
  filterUpstreamHeaders,
  applyDefaultCache,
} from '@/lib/assetProxyShared'

export const dynamic = 'force-dynamic'

function buildExportPath (segments: string[]): string {
  if (!segments.length) return '/export'
  return '/export/' + segments.map((s) => encodeURIComponent(s)).join('/')
}

export async function GET (
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const bad = assertSafePathSegments(segments)
  if (bad) {
    return new NextResponse(bad, { status: 400 })
  }
  if (!segments.length) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const exportPath = buildExportPath(segments)
  const search = new URL(request.url).search
  const upstream = await fetchFromAssetMirrors('timeline', exportPath, { search })
  if (!upstream) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const headers = filterUpstreamHeaders(upstream.headers)
  applyDefaultCache(headers)

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}

export async function HEAD (
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const bad = assertSafePathSegments(segments)
  if (bad) {
    return new NextResponse(null, { status: 400 })
  }
  if (!segments.length) {
    return new NextResponse(null, { status: 404 })
  }

  const exportPath = buildExportPath(segments)
  const search = new URL(request.url).search
  const upstream = await fetchFromAssetMirrors('timeline', exportPath, {
    method: 'HEAD',
    search,
  })
  if (!upstream) {
    return new NextResponse(null, { status: 404 })
  }

  const headers = filterUpstreamHeaders(upstream.headers)
  return new NextResponse(null, {
    status: upstream.status,
    headers,
  })
}
