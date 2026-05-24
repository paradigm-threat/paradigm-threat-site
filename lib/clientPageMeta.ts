'use client'

/**
 * Update document title and common meta tags after client-side article load (no server SSR / FOT).
 */

const CANONICAL_ORIGIN =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
  'https://paradigmthreat.net'

function upsertMeta (attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined' || !content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLinkCanonical (href: string) {
  if (typeof document === 'undefined' || !href) return
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export interface ClientPageMetaOptions {
  title?: string
  description?: string
  ogImageUrl?: string
  /** Site path e.g. `/blog/foo` or empty for home */
  canonicalPath?: string
}

export function applyClientPageMeta (opts: ClientPageMetaOptions): void {
  if (typeof document === 'undefined') return

  if (opts.title) {
    document.title = opts.title
    upsertMeta('property', 'og:title', opts.title)
    upsertMeta('name', 'twitter:title', opts.title)
  }

  if (opts.description) {
    upsertMeta('name', 'description', opts.description)
    upsertMeta('property', 'og:description', opts.description)
    upsertMeta('name', 'twitter:description', opts.description)
  }

  if (opts.ogImageUrl) {
    upsertMeta('property', 'og:image', opts.ogImageUrl)
    upsertMeta('name', 'twitter:image', opts.ogImageUrl)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
  }

  const path = opts.canonicalPath ?? ''
  const origin = CANONICAL_ORIGIN.replace(/\/$/, '')
  const canonical = path ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : origin
  upsertLinkCanonical(canonical)
  upsertMeta('property', 'og:url', canonical)
}
