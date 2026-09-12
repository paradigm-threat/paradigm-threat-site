/**
 * Header/footer chrome destinations after apex → Relay cutover.
 *
 * App subdomains (`timeline.` / `chat.`) rewrite `/` → feature path, so relative
 * Home `/` loops. Mirror park Nav: Home/Search → production apex; Timeline/Chat →
 * their subdomains.
 */

import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'

export const PRODUCTION_SITE_ORIGIN = CANONICAL_SITE_ORIGIN
export const TIMELINE_SITE_ORIGIN = 'https://timeline.paradigmthreat.net'
export const CHAT_SITE_ORIGIN = 'https://chat.paradigmthreat.net'
export const ARCHIVE_SITE_ORIGIN = 'https://old.paradigmthreat.net'

function originHref (origin: string, path = '/'): string {
  const base = origin.replace(/\/$/, '')
  if (!path || path === '/') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function productionSiteHref (path = '/'): string {
  return originHref(PRODUCTION_SITE_ORIGIN, path)
}

export function timelineSiteHref (path = '/'): string {
  return originHref(TIMELINE_SITE_ORIGIN, path)
}

export function chatSiteHref (path = '/'): string {
  return originHref(CHAT_SITE_ORIGIN, path)
}

export function archiveSiteHref (path = '/'): string {
  return originHref(ARCHIVE_SITE_ORIGIN, path)
}

/** Primary header destinations (icons attached in Navbar). */
export const SITE_CHROME_NAV = {
  search: productionSiteHref('/search'),
  home: productionSiteHref('/'),
  timeline: timelineSiteHref('/'),
  chat: chatSiteHref('/'),
  substack: 'https://paradigmthreat2.substack.com/',
  videos: 'https://www.bitchute.com/channel/paradigmthreat',
  donate: 'https://www.patreon.com/c/ahsctimeline',
  submit: archiveSiteHref('/submit'),
} as const

/**
 * Active state for chrome links. Pass `hostname` from `window.location` on client
 * so timeline/chat subdomains highlight correctly even when href is absolute.
 */
export function isSiteChromeNavActive (
  href: string,
  pathname: string,
  hostname = '',
): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  const path = pathname || '/'

  if (href === SITE_CHROME_NAV.home) {
    return (
      (host === 'paradigmthreat.net' || host === 'www.paradigmthreat.net') &&
      (path === '/' || path === '')
    )
  }
  if (href === SITE_CHROME_NAV.search || href.endsWith('/search')) {
    return path === '/search' || path.startsWith('/search/')
  }
  if (href === SITE_CHROME_NAV.timeline || href.includes('://timeline.paradigmthreat.')) {
    return (
      host === 'timeline.paradigmthreat.net' ||
      path === '/timeline' ||
      path.startsWith('/timeline/')
    )
  }
  if (href === SITE_CHROME_NAV.chat || href.includes('://chat.paradigmthreat.')) {
    return (
      host === 'chat.paradigmthreat.net' ||
      path === '/chat' ||
      path.startsWith('/chat/')
    )
  }
  try {
    const u = new URL(href, PRODUCTION_SITE_ORIGIN)
    return path === u.pathname
  } catch {
    return path === href
  }
}
