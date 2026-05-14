import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RASTER_OR_IMAGE = /\.(avif|gif|ico|jpe?g|png|svg|webp)(\?.*)?$/i

/** App routes that must not be rewritten to the files mirror proxy. */
const SKIP_PREFIX =
  /^\/(?:api|_next|files|export|site|search|book-landing|wasm|sw\.js|workbox|manifest\.webmanifest)(\/|$)/

/**
 * Repo-root image paths (e.g. `/influence/foo.jpg`) 404 on the Next origin.
 * Rewrite to `/files/...` so `app/files/[[...path]]` can proxy a mirror.
 */
export function middleware (request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next()

  const { pathname } = request.nextUrl
  if (!pathname || pathname === '/') return NextResponse.next()
  if (SKIP_PREFIX.test(pathname)) return NextResponse.next()
  if (!RASTER_OR_IMAGE.test(pathname)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/files${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
