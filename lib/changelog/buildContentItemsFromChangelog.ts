import { classifyContentPath, type ContentKind } from './classifyContentPath'

const RASTER_EXT = /\.(png|jpe?g|gif|webp)$/i

export interface ChangelogFileRef {
  path: string
  href: string
  status?: string
}

export interface ChangelogImageRef {
  src: string
  alt?: string
}

export interface ChangelogEntry {
  repo: string
  date: string
  message: string
  files: ChangelogFileRef[]
  images: ChangelogImageRef[]
}

export type TabContentKind = Exclude<ContentKind, 'exclude'>

export interface ContentItem {
  path: string
  href: string
  /** Sort key: original publish date when known, else last updated. */
  date: string
  /** Last modified from index `_updated`. */
  updatedAt: string
  /** Substack original publish when available in index.json. */
  originalPublishedAt: string | null
  repo: string
  imageSrc: string | null
  kind: TabContentKind
}

function pathSlug (mdPath: string): string {
  const base = mdPath.replace(/\\/g, '/').split('/').pop() || ''
  return base.replace(/\.md$/i, '')
}

function imageBasename (src: string): string {
  const noQuery = src.split('?')[0]
  const fromUrl = noQuery.includes('://')
    ? (() => {
        try {
          return new URL(noQuery).pathname
        } catch {
          return noQuery
        }
      })()
    : noQuery
  const base = fromUrl.split('/').pop() || ''
  return base.replace(RASTER_EXT, '')
}

function findImageForPath (mdPath: string, entry: ChangelogEntry): string | null {
  const slug = pathSlug(mdPath)

  for (const im of entry.images || []) {
    if (!im?.src) continue
    if (imageBasename(im.src) === slug) return im.src
  }

  for (const f of entry.files || []) {
    const p = f.path || ''
    if (!RASTER_EXT.test(p)) continue
    if (imageBasename(p) === slug) {
      return p.startsWith('/') ? p : `/${p.replace(/^\//, '')}`
    }
  }

  return null
}

function upsertItem (
  map: Map<string, ContentItem>,
  file: ChangelogFileRef,
  entry: ChangelogEntry,
  kind: TabContentKind,
): void {
  const existing = map.get(file.path)
  const entryTime = new Date(entry.date).getTime()
  if (existing && new Date(existing.date).getTime() >= entryTime) return

  const imageFromEntry = findImageForPath(file.path, entry)
  map.set(file.path, {
    path: file.path,
    href: file.href,
    date: entry.date,
    updatedAt: entry.date,
    originalPublishedAt: existing?.originalPublishedAt ?? null,
    repo: entry.repo,
    imageSrc: imageFromEntry ?? existing?.imageSrc ?? null,
    kind,
  })
}

export interface ContentItemsByTab {
  articles: ContentItem[]
  investigations: ContentItem[]
  blog: ContentItem[]
}

export function buildContentItemsFromChangelog (entries: ChangelogEntry[]): ContentItemsByTab {
  const byPath = new Map<string, ContentItem>()

  for (const entry of entries) {
    if (entry.repo !== 'paradigm-threat-files') continue

    for (const file of entry.files || []) {
      if (!file.path || !file.href) continue
      const kind = classifyContentPath(file.path, entry.repo)
      if (kind === 'exclude') continue
      upsertItem(byPath, file, entry, kind)
    }
  }

  const articles: ContentItem[] = []
  const investigations: ContentItem[] = []
  const blogPosts: ContentItem[] = []

  for (const item of Array.from(byPath.values())) {
    if (item.kind === 'article') articles.push(item)
    else if (item.kind === 'investigation') investigations.push(item)
    else blogPosts.push(item)
  }

  const byDateDesc = (a: ContentItem, b: ContentItem) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()

  articles.sort(byDateDesc)
  investigations.sort(byDateDesc)
  blogPosts.sort(byDateDesc)

  return { articles, investigations, blog: blogPosts }
}
