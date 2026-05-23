import { NextResponse } from 'next/server'
import { getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'

/** Legacy Vercel export proxy removed — redirect to timeline mirror export files. */
function timelineExportUrl (segments: string[], search: string): string {
  const base = getPrimaryTimelineBaseUrl().replace(/\/+$/, '')
  if (!segments.length) {
    return `${base}/export/`
  }
  const path = '/export/' + segments.map((s) => encodeURIComponent(s)).join('/')
  return `${base}${path}${search}`
}

export async function GET (
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const search = new URL(request.url).search
  return NextResponse.redirect(timelineExportUrl(segments, search), 307)
}

export async function HEAD (
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments = [] } = await context.params
  const search = new URL(request.url).search
  return NextResponse.redirect(timelineExportUrl(segments, search), 307)
}
