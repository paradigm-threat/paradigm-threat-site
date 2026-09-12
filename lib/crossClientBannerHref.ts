/**
 * Header banner between the Next archive (old.paradigmthreat.net) and the Relay
 * park (paradigmthreat.net). Preserve markdown corpus subpaths; otherwise home.
 */

import { productionSiteHref } from '@/lib/siteChromeNav'

const APP_PREFIXES = [
  '/search',
  '/timeline',
  '/chat',
  '/submit',
  '/mcp',
  '/api',
  '/reply',
  '/site',
  '/_next',
  '/export',
  '/files',
  '/hooks',
  '/docs',
]

function pathOnly (pathname: string): string {
  const raw = String(pathname || '/')
  const cut = raw.search(/[?#]/)
  let p = cut >= 0 ? raw.slice(0, cut) : raw
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  if (!p.startsWith('/')) p = `/${p}`
  return p || '/'
}

function lastSegment (path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

function isMdLeaf (seg: string): boolean {
  const s = seg.toLowerCase()
  return s.endsWith('.md') || s.endsWith('.mdx')
}

function hasNonMdExtension (seg: string): boolean {
  if (!seg.includes('.')) return false
  return !isMdLeaf(seg)
}

function startsWithPrefix (path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** True for files-corpus article URLs (pretty or `.md`), not app shells or home. */
export function isMdCorpusSubpath (pathname: string): boolean {
  const path = pathOnly(pathname)
  if (path === '/' || path === '/page.md' || path === '/index.md' || path === '/page.mdx') {
    return false
  }
  for (const prefix of APP_PREFIXES) {
    if (startsWithPrefix(path, prefix)) return false
  }
  const seg = lastSegment(path)
  if (hasNonMdExtension(seg)) return false
  if (isMdLeaf(seg)) return true
  return path.split('/').filter(Boolean).length >= 2
}

/** Pretty path the archive catch-all understands (no `.md`). */
export function archivePrettyPath (pathname: string): string {
  if (!isMdCorpusSubpath(pathname)) return '/'
  let path = pathOnly(pathname)
  const lower = path.toLowerCase()
  if (lower.endsWith('.mdx')) path = path.slice(0, -4)
  else if (lower.endsWith('.md')) path = path.slice(0, -3)
  return path || '/'
}

/** Relay apex href for the archive banner. */
export function productionBannerHref (pathname: string): string {
  return productionSiteHref(archivePrettyPath(pathname))
}
