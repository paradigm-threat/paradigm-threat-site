import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

export function isTimelineSearchEntry (path: string): boolean {
  const p = path.replace(/^\//, '')
  return p.startsWith('timeline/') && p.length > 'timeline/'.length && !p.slice('timeline/'.length).includes('/')
}

export function isArticleMdEntry (path: string): boolean {
  return /\.(md|mdx)$/i.test(path) && !path.includes('.auto.md')
}

/** Human-readable label for search result rows (files + timeline events). */
export function searchEntryTitle (entry: IndexedPathEntry): string {
  const path = entry.path.replace(/^\//, '')
  const slug = path.replace(/\.(md|mdx)$/i, '').split('/').pop() ?? path
  const fromSlug = slug.replace(/[-_]+/g, ' ').trim()

  if (isTimelineSearchEntry(path)) {
    const eventId = path.slice('timeline/'.length)
    const words = entry.searchText.split(/\s+/).filter(Boolean)
    if (words[0] === eventId && words.length >= 2) {
      const titleWords: string[] = []
      for (let i = 1; i < words.length; i++) {
        const w = words[i]!
        if (w.includes('/') || /\.mdx?$/i.test(w)) break
        titleWords.push(w)
      }
      const title = titleWords.join(' ').trim()
      if (title.length >= 2) return title
    }
    return fromSlug.replace(/^evt[- ]?/i, '').trim() || fromSlug
  }

  const prefix = path + ' '
  if (entry.searchText.startsWith(prefix)) {
    const after = entry.searchText.slice(prefix.length).trim()
    const words = after.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      const candidate = words.slice(0, Math.min(10, words.length)).join(' ')
      if (candidate.length > fromSlug.length) return candidate
    }
  }
  return fromSlug
}

export function searchEntryHref (path: string): string {
  const p = path.replace(/^\//, '')
  if (isTimelineSearchEntry(p)) return `/${p}`
  if (/\.(md|mdx)$/i.test(p)) return `/${p.replace(/\.(md|mdx)$/i, '')}`
  return `/${p}`
}
