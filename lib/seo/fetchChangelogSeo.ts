import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { getTimelineOrigins } from '@/lib/timelineOrigins'
import { escapeHtml } from '@/lib/seo/escapeHtml'

export interface ChangelogSeoEntry {
  repo: string
  date: string
  message: string
  href?: string
}

function toHrefForRepo (pathLike: string, repo: string): string | undefined {
  const clean = String(pathLike || '').replace(/^\/+/, '')
  if (!clean) return undefined
  if (repo === 'paradigm-threat-timeline') {
    return clean.startsWith('timeline/') ? `/${clean}` : `/timeline/${clean}`.replace(/\/+/g, '/')
  }
  return `/${clean}`
}

function inferHrefFromMessage (message: string, repo: string): string | undefined {
  const pathMatch = message.match(/\b([a-z0-9._-]+\/[a-z0-9._/-]+)\b/i)
  if (!pathMatch) return undefined
  const rawPath = pathMatch[1].replace(/[),.;:!?]+$/, '')
  return toHrefForRepo(rawPath, repo)
}

function normalizeEntry (entry: unknown, fallbackRepo: string): ChangelogSeoEntry | null {
  if (!entry || typeof entry !== 'object') return null
  const e = entry as Record<string, unknown>
  const repo = typeof e.repo === 'string' ? e.repo : fallbackRepo
  const message = typeof e.message === 'string' ? e.message : ''
  const date = typeof e.date === 'string' ? e.date : ''
  let href: string | undefined

  const files = Array.isArray(e.files) ? e.files : []
  if (files.length > 0 && files[0] && typeof files[0] === 'object') {
    const f = files[0] as Record<string, unknown>
    if (typeof f.href === 'string') href = f.href
    else if (typeof f.path === 'string') href = toHrefForRepo(f.path, repo)
  }
  if (!href) href = inferHrefFromMessage(message, repo)

  return { repo, date, message, href }
}

async function fetchChangelogJson (repo: 'files' | 'timeline'): Promise<unknown[]> {
  const res = await fetchFromAssetMirrors(repo, '/changelog.json', { cache: 'no-store' })
  if (!res?.ok) return []
  try {
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Recent changelog rows for server-rendered SEO (mirrors client ChangeLog data sources). */
export async function fetchChangelogSeoEntries (limit = 12): Promise<ChangelogSeoEntry[]> {
  const [filesData, timelineData] = await Promise.all([
    fetchChangelogJson('files'),
    fetchChangelogJson('timeline'),
  ])

  const merged = [
    ...filesData.map((x) => normalizeEntry(x, 'paradigm-threat-files')).filter(Boolean),
    ...timelineData.map((x) => normalizeEntry(x, 'paradigm-threat-timeline')).filter(Boolean),
  ] as ChangelogSeoEntry[]

  return merged
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
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

  return `<nav aria-label="Change log"><ul>\n${items}\n</ul></nav>`
}
