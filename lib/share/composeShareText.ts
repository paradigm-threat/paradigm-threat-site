import type { SharePlatformId } from '@/lib/share/platformLimits'
import {
  BLUESKY_MAX,
  TRUTHSOCIAL_TEXT_MAX,
  THREADS_MAX,
  X_MAX,
  X_URL_WEIGHT,
} from '@/lib/share/platformLimits'

/**
 * Truth Social (and any future intent that passes `url=` separately) must not repeat the same URL
 * inside `text=` or the composer shows it twice.
 */
export function platformUsesSeparateUrlInShareIntent (platform: SharePlatformId): boolean {
  return platform === 'truthsocial'
}

/** Remove duplicate occurrences of `canonicalUrl` in plain text (standalone lines + repeated runs). */
export function dedupeCanonicalUrlInPlainText (text: string, canonicalUrl: string): string {
  const u = canonicalUrl.trim()
  if (!text || !u) return text
  const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let s = text
    .split('\n')
    .filter((line) => line.trim() !== u)
    .join('\n')
  const repeated = new RegExp(`(?:${escaped})(?:\\s*\\n*\\s*)+(?:${escaped})+`, 'g')
  s = s.replace(repeated, u)
  return s.replace(/\n{3,}/g, '\n\n').trim()
}

export interface ComposeShareInput {
  title: string
  canonicalUrl: string
  snippetPlain: string
  hashtagsLine: string
  articleBodyPlain: string
}

/** X counts every http(s) URL as 23 chars (t.co) — informational only. */
export function effectiveLengthX (text: string): number {
  const re = /https?:\/\/[^\s]+/g
  let pos = 0
  let len = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    len += text.slice(pos, m.index).length
    len += X_URL_WEIGHT
    pos = m.index + m[0].length
  }
  len += text.slice(pos).length
  return len
}

/**
 * Full share text, no truncation. Order: title → hashtags → URL → snippet → article body.
 * `platform` is ignored; kept for call-site stability.
 */
export function composeShareText (_platform: SharePlatformId, input: ComposeShareInput): string {
  const title = input.title.trim()
  const hashtags = input.hashtagsLine.trim()
  const url = input.canonicalUrl.trim()
  const snippet = input.snippetPlain.trim()
  const article = input.articleBodyPlain.trim()

  const parts: string[] = [title]
  if (hashtags) parts.push('', hashtags)
  parts.push('', url)
  if (snippet) parts.push('', snippet)
  if (article) parts.push('', article)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Character count for the copy box (no platform cap). */
export function shareTextCharCount (text: string): number {
  return text.length
}

function joinShareParts (
  title: string,
  hashtags: string,
  url: string,
  snippet: string,
  article: string,
  opts?: { includeCanonicalUrl?: boolean }
): string {
  const includeUrl = opts?.includeCanonicalUrl !== false
  const parts: string[] = [title]
  if (hashtags) parts.push('', hashtags)
  if (includeUrl) parts.push('', url)
  if (snippet) parts.push('', snippet)
  if (article) parts.push('', article)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function effectiveLengthPlatform (platform: SharePlatformId, text: string): number {
  if (platform === 'x' || platform === 'threads') return effectiveLengthX(text)
  return text.length
}

/** Platforms that pass full copy into a query param; must stay within compose limits. */
export function platformUsesTruncatedOutboundIntent (platform: SharePlatformId): boolean {
  return platform === 'x' || platform === 'threads' || platform === 'bluesky' || platform === 'truthsocial'
}

function outboundIntentLimit (platform: SharePlatformId): number | null {
  switch (platform) {
    case 'x':
      return X_MAX
    case 'threads':
      return THREADS_MAX
    case 'bluesky':
      return BLUESKY_MAX
    case 'truthsocial':
      return TRUTHSOCIAL_TEXT_MAX
    default:
      return null
  }
}

/**
 * Shortened text for intent URLs only (X, Threads, Bluesky, Truth Social).
 * Same block order as composeShareText; trims article → snippet → hashtags → title last resort.
 */
export function truncateShareTextForOutbound (
  platform: SharePlatformId,
  input: ComposeShareInput
): string {
  const limit = outboundIntentLimit(platform)
  let title = input.title.trim()
  let hashtags = input.hashtagsLine.trim()
  let url = input.canonicalUrl.trim()
  let snippet = input.snippetPlain.trim()
  let article = input.articleBodyPlain.trim()

  const omitUrlInBody = platformUsesSeparateUrlInShareIntent(platform)
  if (omitUrlInBody) {
    snippet = dedupeCanonicalUrlInPlainText(snippet, url)
    article = dedupeCanonicalUrlInPlainText(article, url)
  }
  const joinOpts = omitUrlInBody ? { includeCanonicalUrl: false as const } : undefined

  if (limit == null) {
    return joinShareParts(title, hashtags, url, snippet, article, joinOpts)
  }

  const measure = (s: string) => effectiveLengthPlatform(platform, s)

  let text = joinShareParts(title, hashtags, url, snippet, article, joinOpts)
  let guard = 0
  while (measure(text) > limit && guard < 500) {
    guard++
    if (article.length > 80) {
      article = article.slice(0, Math.max(0, article.length - 120)).trim()
      if (article.length > 0 && !article.endsWith('…')) article += '…'
    } else if (article.length > 0) {
      article = ''
    } else if (snippet.length > 20) {
      snippet = snippet.slice(0, Math.max(0, Math.floor(snippet.length * 0.65))).trim() + '…'
    } else if (snippet.length > 0) {
      snippet = ''
    } else if (hashtags) {
      const tags = hashtags.split(/\s+/).filter(Boolean)
      if (tags.length > 1) hashtags = tags.slice(0, -1).join(' ')
      else hashtags = ''
    } else {
      const t = input.title.trim()
      if (t.length <= 1) break
      const titleMax = Math.max(12, Math.floor(t.length * 0.85))
      title = `${t.slice(0, titleMax).trim()}…`
    }
    text = joinShareParts(title, hashtags, url, snippet, article, joinOpts)
  }

  return text
}
