import { buildArticleMdCandidatePaths } from '@/lib/articleMdPaths'

function encodePathSegments (relPath: string): string {
  const norm = relPath.replace(/^\/+/, '')
  if (!norm) return ''
  return norm
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

/** Absolute URL for raw markdown on the active files mirror. */
export function buildRelayMdDownloadUrl (filesOrigin: string, mdRelPath: string): string {
  const base = filesOrigin.replace(/\/+$/, '')
  const encoded = encodePathSegments(mdRelPath)
  return encoded ? `${base}/${encoded}` : base
}

export function relayMdDownloadFilename (mdRelPath: string): string {
  const base = mdRelPath.replace(/^\/+/, '').split('/').pop() || 'article.md'
  return base.endsWith('.md') || base.endsWith('.mdx') ? base : `${base}.md`
}

/** Repo-relative markdown path for download; prefers resolved target from article fetch. */
export function resolveArticleMdRelPathForDownload (
  siteUrlPath: string,
  mdRelayPath?: string,
): string | null {
  const hint = mdRelayPath?.trim()
  if (hint) return hint.replace(/^\/+/, '')

  const logical = siteUrlPath.replace(/^\/+/, '').replace(/\/$/, '')
  if (!logical) return 'page.md'

  const lastSeg = logical.split('/').pop() || ''
  if (/\.(txt|cs)$/i.test(lastSeg)) return null

  const candidates = buildArticleMdCandidatePaths(logical)
  return candidates[0] ?? null
}

export function shouldOfferRelayMdDownload (
  siteUrlPath: string,
  mdRelayPath?: string,
  mdSource?: string,
): boolean {
  if (mdRelayPath?.trim()) return true
  if (!mdSource?.trim()) return false
  return resolveArticleMdRelPathForDownload(siteUrlPath, mdRelayPath) != null
}
