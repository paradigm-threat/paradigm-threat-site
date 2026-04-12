/**
 * Public-facing absolute URLs for shared assets (OG, high-res links).
 * Always https://paradigmthreat.net — not thirdstory.site or relay hostnames.
 */
export const CANONICAL_SITE_ORIGIN = 'https://paradigmthreat.net'

/** paradigm-threat-files paths: /files/<repo-relative-path> */
export function publicFilesAssetUrl (relPath: string): string {
  const p = relPath.replace(/^\/+/, '')
  return `${CANONICAL_SITE_ORIGIN}/files/${p}`
}

/** paradigm-threat-timeline paths: /files/timeline/<site-relative-path> */
export function publicTimelineAssetUrl (relPath: string): string {
  const p = relPath.replace(/^\/+/, '')
  return `${CANONICAL_SITE_ORIGIN}/files/timeline/${p}`
}
