import type { ContentKind } from './classifyContentPath'

export type TabContentKind = Exclude<ContentKind, 'exclude'>

export interface ContentItem {
  path: string
  href: string
  /** Index/doc title when present (avoids waiting on markdown fetch). */
  title?: string | null
  /** Display date: original publish date when known, else last updated. */
  date: string
  /** Last modified from Relay SQLite `_updated`. */
  updatedAt: string
  /** Stable publish date when available, e.g. dated blog slug. */
  originalPublishedAt: string | null
  repo: string
  imageSrc: string | null
  kind: TabContentKind
}

export interface ContentItemsByTab {
  articles: ContentItem[]
  investigations: ContentItem[]
  blog: ContentItem[]
}

export interface RecentFeedFile {
  path: string
  href: string
  status?: string
}

export interface RecentFeedImage {
  src: string
  alt?: string
}

export interface RecentFeedEntry {
  repo: string
  date: string
  message: string
  files: RecentFeedFile[]
  images: RecentFeedImage[]
}
