import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'
import { edgeDocumentCacheControlHeader } from '@/lib/edgeDocumentCache'
import { shouldCacheDocumentPath } from '@/lib/middlewareDocumentCache'

const RASTER_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i

/** Paths that stay dynamic (no CDN document cache). */
function shouldCacheDocument (pathname: string): boolean {
  return shouldCacheDocumentPath(pathname)
}

function withDocumentCache (response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', edgeDocumentCacheControlHeader())
  return response
}

/**
 * Raster GETs on site origin → Relay mirror (edge hit).
 * Document GETs → Cache-Control for CDN (article/hub HTML shell).
 */
export function middleware (request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (RASTER_EXT.test(pathname)) {
    const rel = relPathFromCanonicalSiteUrl(pathname)
    if (rel) {
      const wParam =
        request.nextUrl.searchParams.get('w') ??
        request.nextUrl.searchParams.get('width')
      const wParsed = wParam ? parseInt(wParam, 10) : undefined
      const width = Number.isFinite(wParsed) && wParsed! > 0 ? wParsed : undefined
      const dest = buildOptimizedAssetUrl(`/${rel}`, width)
      return NextResponse.redirect(dest, 307)
    }
  }

  if (request.method === 'GET' && shouldCacheDocument(pathname)) {
    return withDocumentCache(NextResponse.next())
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
}
