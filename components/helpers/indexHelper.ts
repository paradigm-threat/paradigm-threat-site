/**
 * Flatten nested index.json into searchable entries.
 * Each file may include `_title`, `_keywords`, and `_searchSnippet` (from generate-index.py) for searchText.
 */

export type IndexedPathEntry = {
  path: string
  /** Lowercasing done at search time; includes path, title, and keyword tokens */
  searchText: string
}

function buildFileSearchText(path: string, value: Record<string, unknown>): string {
  const parts: string[] = [path]
  const t = value._title
  if (typeof t === 'string' && t.trim()) parts.push(t.trim())
  const kw = value._keywords
  if (Array.isArray(kw)) {
    for (const k of kw) {
      if (typeof k === 'string' && k.trim()) parts.push(k.trim())
    }
  }
  const snippet = value._searchSnippet
  if (typeof snippet === 'string' && snippet.trim()) parts.push(snippet.trim())
  return parts.join(' ')
}

export function flattenFilesIndex(index: any, prefix = ''): IndexedPathEntry[] {
  if (!index || typeof index !== 'object') return []
  if (Array.isArray(index)) return []

  const paths: IndexedPathEntry[] = []
  for (const key in index) {
    if (key.startsWith('_')) continue

    const path = prefix ? `${prefix}/${key}` : key
    const value = index[key]

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const children = Object.keys(value).filter((k) => !k.startsWith('_'))
      if (children.length === 0) {
        const searchText = buildFileSearchText(path, value as Record<string, unknown>)
        paths.push({ path, searchText })
      } else {
        paths.push({ path, searchText: path })
        paths.push(...flattenFilesIndex(value, path))
      }
    } else {
      paths.push({ path, searchText: path })
    }
  }
  return paths
}

type TimelineEventsJson = {
  entries?: unknown[]
}

/** Walk timeline data/events.json tree; paths are timeline/<id> for site routes */
export function flattenTimelineEntriesForSearch(data: TimelineEventsJson | null): IndexedPathEntry[] {
  const out: IndexedPathEntry[] = []
  function walk(nodes: unknown[]) {
    if (!Array.isArray(nodes)) return
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue
      const o = n as Record<string, unknown>
      if (typeof o.id === 'string' && typeof o.md_path === 'string') {
        const id = o.id
        const title = typeof o.title === 'string' ? o.title : ''
        const mdPath = o.md_path
        const kws = Array.isArray(o.keywords) ? o.keywords.map((x) => String(x)) : []
        const searchText = [id, title, mdPath, ...kws].filter(Boolean).join(' ')
        out.push({ path: `timeline/${id}`, searchText })
      }
      if (Array.isArray(o.children)) walk(o.children as unknown[])
    }
  }
  if (data?.entries) walk(data.entries)
  return out
}
