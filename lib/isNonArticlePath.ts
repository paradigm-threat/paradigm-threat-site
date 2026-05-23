/**
 * Paths that look like static assets, not MD/MDX articles from the files repo.
 * Prevents fetchArticle /api/article from probing FILES_BASE_URL for .md/.mdx.
 * Includes `.txt` (plain text is served via `fetchTextLeaf` / `TextLeafClientShell`, not MDX).
 * Includes `.cs` under `hooks/**` — same leaf pipeline as `.txt`.
 */
const STATIC_ASSET_EXT =
  /\.(svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|mp4|webm|pdf|cs|txt)$/i

export function isNonArticlePath (path: string): boolean {
  if (!path || path === '/') return false
  const segment = path.split('/').filter(Boolean).pop() || ''
  return STATIC_ASSET_EXT.test(segment)
}

/** Raster/SVG paths that should 307 to Relay mirrors (not .txt / .cs text leaves). */
const MIRROR_REDIRECT_EXT =
  /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg|pdf|woff2?|ttf|eot|mp4|webm)$/i

export function shouldRedirectPathToMirrorAsset (path: string): boolean {
  if (!path || path === '/') return false
  const segment = path.split('/').filter(Boolean).pop() || ''
  return MIRROR_REDIRECT_EXT.test(segment)
}
