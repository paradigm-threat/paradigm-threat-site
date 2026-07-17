import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import type { TimelineData, TimelineEntry, IntroArticle } from '@/components/TimelineContext'

type Row = Record<string, unknown>

/** Rebuild nested files catalog tree with `_count` from flat QUERY path rows. */
export function rebuildFilesCatalogTree (rows: Row[]): Record<string, unknown> {
  const root: Record<string, unknown> = {}

  for (const r of rows) {
    const path = typeof r.path === 'string' ? r.path : ''
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!
      const existing = cur[part]
      if (!existing || typeof existing !== 'object' || !('_count' in (existing as object))) {
        cur[part] = { _count: 0 }
      }
      cur = cur[part] as Record<string, unknown>
    }
    const leaf = parts[parts.length - 1]!
    const doc: Record<string, unknown> = { ...r }
    delete doc.path
    cur[leaf] = doc
  }

  function recount (node: Record<string, unknown>): number {
    let total = 0
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue
      if (v && typeof v === 'object' && !Array.isArray(v) && '_count' in (v as object)) {
        const c = recount(v as Record<string, unknown>)
        ;(v as Record<string, unknown>)._count = c
        total += c
      } else {
        total += 1
      }
    }
    return total
  }

  recount(root)
  return root
}

function collectChildIds (node: Row, into: Set<string>) {
  const children = node.children
  if (!Array.isArray(children)) return
  for (const c of children) {
    if (!c || typeof c !== 'object') continue
    const o = c as Row
    if (typeof o.id === 'string') into.add(o.id)
    collectChildIds(o, into)
  }
}

type TimelineOrderFields = {
  sort_key?: unknown
  md_path?: unknown
  id?: unknown
}

function timelineSortKey (row: TimelineOrderFields): string {
  if (typeof row.sort_key === 'string' && row.sort_key) return `0:${row.sort_key}`
  if (typeof row.md_path === 'string' && row.md_path) return `1:${row.md_path}`
  return `2:${typeof row.id === 'string' ? row.id : ''}`
}

function orderedTimelineEntry (row: Row): TimelineEntry {
  const children = Array.isArray(row.children)
    ? row.children
      .filter((child): child is Row => Boolean(child) && typeof child === 'object')
      .map(orderedTimelineEntry)
      .sort((a, b) => timelineSortKey(a).localeCompare(timelineSortKey(b)))
    : []
  return { ...row, children } as unknown as TimelineEntry
}

/** Rebuild timeline { entries, introArticles } from QUERY events rows. */
export function eventsRowsToTimelineData (rows: Row[]): TimelineData {
  const manifestIntro = rows.find((r) => r.id === '__introArticles__')
  const eventRows = rows.filter(
    (r) =>
      typeof r.id === 'string' &&
      r.id !== '__introArticles__' &&
      r.id !== '__meta__' &&
      r.type !== 'manifest',
  )

  const childIds = new Set<string>()
  for (const r of eventRows) collectChildIds(r, childIds)

  const entries = eventRows
    .filter((r) => typeof r.id === 'string' && !childIds.has(r.id))
    .map(orderedTimelineEntry)
    .sort((a, b) => timelineSortKey(a).localeCompare(timelineSortKey(b)))

  let introArticles: IntroArticle[] = []
  if (manifestIntro && Array.isArray(manifestIntro.introArticles)) {
    introArticles = manifestIntro.introArticles as IntroArticle[]
  }

  return { entries, introArticles }
}

export function filesRowsToIndexedEntries (rows: Row[]): IndexedPathEntry[] {
  const out: IndexedPathEntry[] = []
  for (const r of rows) {
    const path = typeof r.path === 'string' ? r.path : ''
    if (!path) continue
    const parts: string[] = [path]
    const title = typeof r._title === 'string' ? r._title : typeof r.title === 'string' ? r.title : ''
    if (title) parts.push(title)
    const kw = r._keywords ?? r.keywords
    if (Array.isArray(kw)) {
      for (const k of kw) {
        if (typeof k === 'string' && k.trim()) parts.push(k.trim())
      }
    }
    out.push({ path, searchText: parts.join(' ') })
  }
  return out
}

export function eventRowsToIndexedEntries (rows: Row[]): IndexedPathEntry[] {
  const out: IndexedPathEntry[] = []
  for (const r of rows) {
    if (typeof r.id !== 'string' || r.id.startsWith('__') || r.type === 'manifest') continue
    const id = r.id
    const title = typeof r.title === 'string' ? r.title : ''
    const mdPath = typeof r.md_path === 'string' ? r.md_path : ''
    const kws = Array.isArray(r.keywords) ? r.keywords.map(String) : []
    const searchText = [id, title, mdPath, ...kws].filter(Boolean).join(' ')
    out.push({ path: `timeline/${id}`, searchText })
  }
  return out
}
