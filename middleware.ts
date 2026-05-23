import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'

const RASTER_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i

/**
 * Direct GETs to repo raster paths on the site origin (e.g. /history/.../foo.png)
 * redirect to the primary Relay mirror — no Next compute or /api/image.
 */
export function middleware (request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!RASTER_EXT.test(pathname)) {
    return NextResponse.next()
  }

  const rel = relPathFromCanonicalSiteUrl(pathname)
  if (!rel) {
    return NextResponse.next()
  }

  const wParam =
    request.nextUrl.searchParams.get('w') ??
    request.nextUrl.searchParams.get('width')
  const wParsed = wParam ? parseInt(wParam, 10) : undefined
  const width = Number.isFinite(wParsed) && wParsed! > 0 ? wParsed : undefined

  const dest = buildOptimizedAssetUrl(`/${rel}`, width)
  return NextResponse.redirect(dest, 307)
}

export const config = {
  matcher: [
    '/((?!_next|api|timeline|chat|search|export|files|site|robots\\.txt|sitemap\\.xml|favicon\\.ico).*)\\.(png|jpg|jpeg|gif|webp|avif|bmp|ico|svg|apng)',
  ],
}
