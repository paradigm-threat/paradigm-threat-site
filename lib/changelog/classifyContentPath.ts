export type ContentKind = 'article' | 'investigation' | 'blog' | 'exclude'

function normalizePath (path: string): string {
  return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '')
}

function basename (path: string): string {
  const parts = normalizePath(path).split('/')
  return parts[parts.length - 1] || ''
}

/**
 * Classify a repo-relative markdown path for ChangeLog content tabs.
 * Priority: blog > investigation > article.
 */
export function classifyContentPath (path: string, repo?: string): ContentKind {
  const normalized = normalizePath(path)

  if (repo === 'paradigm-threat-timeline') return 'exclude'
  if (!normalized.endsWith('.md')) return 'exclude'
  if (normalized.endsWith('.auto.md')) return 'exclude'

  const base = basename(normalized)
  if (base === 'page.md') return 'exclude'
  if (normalized.startsWith('docs/')) return 'exclude'

  if (normalized.startsWith('blog/')) return 'blog'

  if (normalized.includes('/investigations/')) return 'investigation'
  const stem = base.replace(/\.md$/i, '')
  if (/investigation/i.test(stem)) return 'investigation'

  return 'article'
}
