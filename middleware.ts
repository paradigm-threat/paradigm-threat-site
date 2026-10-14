import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildOptimizedAssetUrl } from '@/lib/relayOptimizedAssetUrl'
import { relPathFromCanonicalSiteUrl } from '@/lib/canonicalSiteAssetUrl'
import { edgeDocumentCacheControlHeader, vercelCdnCacheControlHeader } from '@/lib/edgeDocumentCache'
import { shouldCacheDocumentPath } from '@/lib/middlewareDocumentCache'
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'
import { isSsrMirrorRedirectEnabled } from '@/lib/siteOpsFeature'
import {
  isSeoCrawlerUserAgent,
  shouldRedirectPathToFilesMirror,
  sitePathToMirrorHtmlRel,
} from '@/lib/ssrMirrorRedirect'

const RASTER_EXT = /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i

/** Paths that stay dynamic (no CDN document cache). */
function shouldCacheDocument (pathname: string): boolean {
  return shouldCacheDocumentPath(pathname)
}

function withDocumentCache (response: NextResponse): NextResponse {
  const cdn = vercelCdnCacheControlHeader()
  response.headers.set('Cache-Control', edgeDocumentCacheControlHeader())
  response.headers.set('CDN-Cache-Control', cdn)
  response.headers.set('Vercel-CDN-Cache-Control', cdn)
  return response
}

/**
 * Raster GETs on site origin → Relay mirror (edge hit).
 * Document GETs → Cache-Control for CDN (article/hub HTML shell).
 */
/** Site chrome assets live in `public/site/` — do not mirror via Relay. */
function isLocalSiteChromeAsset (pathname: string): boolean {
  return pathname === '/site' || pathname.startsWith('/site/')
}

/** PWA icons, favicon, and self-hosted fonts — serve from Vercel, not Relay. */
const LOCAL_STATIC_EXACT = new Set([
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
])

function isLocalStaticAsset (pathname: string): boolean {
  if (isLocalSiteChromeAsset(pathname)) return true
  if (LOCAL_STATIC_EXACT.has(pathname)) return true
  if (pathname.startsWith('/fonts/')) return true
  return false
}

const TIMELINE_SUBDOMAIN = 'timeline.paradigmthreat.net'
const CHAT_SUBDOMAIN = 'chat.paradigmthreat.net'
const PARK_CHAT = 'https://paradigmthreat.net/chat'

/** Chat subdomain → park mesh ChatApp (legacy Vercel chat UI retired). */
function chatSubdomainRedirect (
  request: NextRequest,
  host: string,
  pathname: string,
): NextResponse | null {
  if (host !== CHAT_SUBDOMAIN) return null
  if (!(request.method === 'GET' || request.method === 'HEAD')) return null

  const rest = pathname.replace(/^\/chat\/?/, '/').replace(/^\//, '')
  const segment = rest.split('/').filter(Boolean)[0] || ''
  if (!segment || segment === 'general') {
    return NextResponse.redirect(PARK_CHAT, 301)
  }
  const slug = segment
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9_\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const channel = !slug || slug === 'general'
    ? 'pt-general'
    : slug.startsWith('pt-')
      ? slug
      : `pt-${slug}`
  return NextResponse.redirect(
    `${PARK_CHAT}?c=${encodeURIComponent(channel)}`,
    301,
  )
}

/** App-surface subdomain: `/` always opens the feature path (Timeline). */
function appSubdomainHomeRedirect (
  request: NextRequest,
  host: string,
  pathname: string,
): NextResponse | null {
  if (!(request.method === 'GET' || request.method === 'HEAD')) return null
  if (!(pathname === '/' || pathname === '')) return null

  if (host !== TIMELINE_SUBDOMAIN) return null

  const url = request.nextUrl.clone()
  url.pathname = '/timeline'
  return NextResponse.redirect(url, 307)
}

export function middleware (request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase()

  const chatRedirect = chatSubdomainRedirect(request, host, pathname)
  if (chatRedirect) return chatRedirect

  const appRedirect = appSubdomainHomeRedirect(request, host, pathname)
  if (appRedirect) return appRedirect

  if (isLocalStaticAsset(pathname)) {
    return NextResponse.next()
  }

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

  // Bot-only: send crawlers to Relay SSR HTML (per-article OG) when flag is on.
  // Include HEAD — many crawlers probe with HEAD before GET (curl -I too).
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    isSsrMirrorRedirectEnabled() &&
    isSeoCrawlerUserAgent(request.headers.get('user-agent')) &&
    shouldRedirectPathToFilesMirror(pathname)
  ) {
    const rel = sitePathToMirrorHtmlRel(pathname)
    const base = getPrimaryFilesBaseUrl().replace(/\/$/, '')
    const dest = `${base}/${rel}`
    return NextResponse.redirect(dest, 307)
  }

  if (request.method === 'GET' && shouldCacheDocument(pathname)) {
    return withDocumentCache(NextResponse.next())
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_vercel/).*)',
  ],
}
