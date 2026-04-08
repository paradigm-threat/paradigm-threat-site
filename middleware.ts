import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isThirdStoryLandingHostname } from '@/lib/thirdStoryLanding'

function landingHost (host: string | null): boolean {
  return isThirdStoryLandingHostname(host)
}

export function middleware (request: NextRequest) {
  const host = request.headers.get('host')
  const { pathname } = request.nextUrl

  // Optional: old path from first-party landing experiment
  if (pathname === '/book-landing') {
    return NextResponse.redirect(new URL('/book', request.url))
  }

  if (pathname === '/' && landingHost(host)) {
    return NextResponse.rewrite(new URL('/book', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/book-landing'],
}
