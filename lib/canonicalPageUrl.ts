import { CANONICAL_SITE_ORIGIN } from '@/lib/canonicalPublicSite'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_ORIGIN

/** Index path or site slug → absolute public page URL. */
export function pathToCanonicalUrl (path: string): string {
  const base = SITE_URL.replace(/\/$/, '')
  const href = feelingLuckyPathToHref(path.replace(/^\//, ''))
  return `${base}${href.startsWith('/') ? href : `/${href}`}`
}
