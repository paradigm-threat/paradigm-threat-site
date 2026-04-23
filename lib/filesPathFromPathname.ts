/**
 * Map the current URL pathname to a directory key in the site files index
 * (same shape as article `basePath`), for {@link AutoIndex}.
 */
export function filesDirectoryFromPathname (
  pathname: string,
  fileList: Record<string, unknown> | null
): string {
  let p = pathname === '/' ? '' : pathname.slice(1).replace(/\/$/, '')
  p = p.replace(/\.(md|mdx)$/, '')
  const parts = p.split('/').filter(Boolean)
  if (parts.length === 0) return ''

  if (parts[parts.length - 1] === 'page') {
    return parts.slice(0, -1).join('/')
  }

  if (fileList) {
    let current: Record<string, unknown> | null = fileList
    for (const seg of parts) {
      const next = current?.[seg]
      if (next === undefined || next === null || typeof next !== 'object') {
        current = null
        break
      }
      current = next as Record<string, unknown>
    }
    if (
      current &&
      typeof current === 'object' &&
      ('page.md' in current || 'page.mdx' in current)
    ) {
      return parts.join('/')
    }
  }

  return parts.slice(0, -1).join('/')
}
