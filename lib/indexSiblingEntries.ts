import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

/**
 * Parent directory for a repo-relative content path (no leading slash).
 * `science/biology/foo.md` → `science/biology`; trailing slug without extension uses the same rule.
 */
export function parentDirectoryFromContentPath(path: string): string {
  const trimmed = path.trim().replace(/^\/+/g, '').replace(/\/+$/g, '')
  if (!trimmed) return ''
  const noExt = trimmed.replace(/\.(md|mdx)$/i, '')
  const parts = noExt.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

/**
 * Indexed **files** whose path is a direct child of `parentDir` (from flattened index.json shape).
 * Skips folder stubs (no `.` in basename), timeline routes, and `.auto.md`.
 */
export function indexedFilesDirectlyUnderDirectory(
  entries: IndexedPathEntry[],
  parentDir: string
): IndexedPathEntry[] {
  const normalizedParent = parentDir.replace(/\/+$/g, '')
  const prefix = normalizedParent ? `${normalizedParent}/` : ''

  const result: IndexedPathEntry[] = []
  for (const e of entries) {
    if (!e?.path || typeof e.path !== 'string') continue
    if (e.path.includes('.auto.md')) continue
    if (e.path.startsWith('timeline/')) continue

    let rest: string
    if (normalizedParent) {
      if (!e.path.startsWith(prefix)) continue
      rest = e.path.slice(prefix.length)
    } else {
      if (e.path.includes('/')) continue
      rest = e.path
    }
    if (rest === '' || rest.includes('/')) continue
    if (!rest.includes('.')) continue
    result.push(e)
  }

  result.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
  return result
}
