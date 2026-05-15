/**
 * Map an SEO HTML anchor `href` to an in-app Next router path, or `null` to keep default browser navigation.
 * Used by {@link SeoArticleBody} so crawlers still see real `<a href>` while JS users get soft navigation.
 */
export function resolveSeoArticleInternalNavHref (
  href: string,
  windowOrigin: string
): string | null {
  const raw = href.trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return null
  }
  if (raw.startsWith('#')) return null
  // Protocol-relative URLs: do not synthesize with `new URL(href)` without a base; leave to the browser.
  if (raw.startsWith('//')) return null

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw)
      if (u.origin !== windowOrigin) return null
      const path = `${u.pathname}${u.search}${u.hash}`
      return path.length > 0 ? path : '/'
    } catch {
      return null
    }
  }

  if (raw.startsWith('/')) {
    return raw
  }

  return null
}
