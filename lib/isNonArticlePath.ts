/**
 * Paths that look like static assets, not MD/MDX articles from the files repo.
 * Prevents fetchArticle /api/article from probing FILES_BASE_URL for .md/.mdx.
 * Includes `.txt` (plain text is served via `fetchTextLeaf` / `TextLeafClientShell`, not MDX).
 */
const STATIC_ASSET_EXT =
  /\.(svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|mp4|webm|pdf|txt)$/i

export function isNonArticlePath (path: string): boolean {
  if (!path || path === '/') return false
  const segment = path.split('/').filter(Boolean).pop() || ''
  return STATIC_ASSET_EXT.test(segment)
}
