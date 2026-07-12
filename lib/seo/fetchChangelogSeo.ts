import { queryRecentFilesContent } from '@/lib/changelog/queryRecentContent'
import { escapeHtml } from '@/lib/seo/escapeHtml'

export interface ChangelogSeoEntry {
  repo: string
  date: string
  message: string
  href?: string
}

/** Recent database rows for server-rendered SEO (mirrors client ChangeLog data source). */
export async function fetchChangelogSeoEntries (limit = 12): Promise<ChangelogSeoEntry[]> {
  try {
    const { feed } = await queryRecentFilesContent()
    return feed
      .map((entry) => ({
        repo: entry.repo,
        date: entry.date,
        message: entry.message,
        href: entry.files[0]?.href,
      }))
      .slice(0, limit)
  } catch {
    return []
  }
}

export function renderChangelogSeoHtml (entries: ChangelogSeoEntry[]): string {
  if (!entries.length) {
    return '<p><em>Recent repository updates.</em></p>'
  }

  const items = entries.map((e) => {
    const date = e.date ? `<time datetime="${escapeHtml(e.date)}">${escapeHtml(e.date.slice(0, 10))}</time>` : ''
    const msg = escapeHtml(e.message || 'Update')
    const body = e.href
      ? `<a href="${escapeHtml(e.href)}">${msg}</a>`
      : msg
    return `<li>${date ? `${date} — ` : ''}${body}</li>`
  }).join('\n')

  return `<nav aria-label="Recent content"><ul>\n${items}\n</ul></nav>`
}
