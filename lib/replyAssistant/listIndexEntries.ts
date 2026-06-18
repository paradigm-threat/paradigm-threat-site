import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import {
  isArticleMdEntry,
  isTimelineSearchEntry,
  searchEntryTitle,
} from '@/lib/searchEntryDisplay'
import {
  type SearchContentFilters,
  filterIndexedEntriesByQuery,
} from '@/lib/searchIndexFilter'

export type IndexEntryKind = 'article' | 'timeline' | 'other' | 'all'

export type ListIndexEntriesInput = {
  prefix?: string
  kind?: IndexEntryKind
  query?: string
  limit?: number
  includeBlog?: boolean
  includeSectionPages?: boolean
}

export type ListIndexEntriesResult = {
  count: number
  totalMatched: number
  entries: Array<{ path: string; title: string; kind: 'article' | 'timeline' | 'other' }>
}

function entryKind (path: string): 'article' | 'timeline' | 'other' {
  if (isTimelineSearchEntry(path)) return 'timeline'
  if (isArticleMdEntry(path)) return 'article'
  return 'other'
}

function matchesKind (path: string, kind: IndexEntryKind): boolean {
  if (kind === 'all') return true
  return entryKind(path) === kind
}

export function listIndexEntries (
  entries: IndexedPathEntry[],
  input: ListIndexEntriesInput,
  contentFilters?: SearchContentFilters
): ListIndexEntriesResult {
  const limit = Math.min(200, Math.max(1, input.limit ?? 50))
  const kind = input.kind ?? 'all'
  const prefix = (input.prefix ?? '').replace(/^\//, '').toLowerCase()

  let pool = entries
  if (input.query?.trim()) {
    pool = filterIndexedEntriesByQuery(entries, input.query.trim(), contentFilters)
  }

  const filtered = pool.filter((e) => {
    const p = e.path.replace(/^\//, '')
    if (prefix && !p.toLowerCase().startsWith(prefix)) return false
    return matchesKind(p, kind)
  })

  const slice = filtered.slice(0, limit).map((e) => ({
    path: e.path,
    title: searchEntryTitle(e),
    kind: entryKind(e.path),
  }))

  return {
    count: slice.length,
    totalMatched: filtered.length,
    entries: slice,
  }
}
