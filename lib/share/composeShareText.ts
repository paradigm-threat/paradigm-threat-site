import {
  type SharePlatformId,
  platformCopyLimit,
  X_URL_WEIGHT,
  INSTAGRAM_HASHTAG_MAX,
} from '@/lib/share/platformLimits'

export interface ComposeShareInput {
  title: string
  canonicalUrl: string
  snippetPlain: string
  hashtagsLine: string
  articleBodyPlain: string
}

/** X counts every http(s) URL as 23 chars (t.co). */
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

function effectiveLength (platform: SharePlatformId, text: string): number {
  if (platform === 'x' || platform === 'threads') return effectiveLengthX(text)
  return text.length
}

function limitHashtagLine (line: string, maxTags: number): string {
  if (!line.trim()) return ''
  const tags = line.trim().split(/\s+/).filter((t) => t.startsWith('#'))
  return tags.slice(0, maxTags).join(' ')
}

function joinShare (
  title: string,
  url: string,
  hashtags: string,
  snippet: string,
  article: string,
  includeArticle: boolean
): string {
  const parts: string[] = [title, '', url]
  if (hashtags) parts.push('', hashtags)
  if (snippet) parts.push('', snippet)
  if (includeArticle && article) parts.push('', article)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function longFormPlatform (platform: SharePlatformId): boolean {
  return platform === 'facebook' || platform === 'instagram' || platform === 'linkedin' || platform === 'reddit'
}

/**
 * Build copy text with priority: title, URL, hashtags, snippet, optional long body.
 * Truncation removes long body first, then snippet, then hashtags (drop tags from the end) — never title/URL.
 */
export function composeShareText (platform: SharePlatformId, input: ComposeShareInput): string {
  const limit = platformCopyLimit(platform)
  const includeArticle = longFormPlatform(platform)

  let snippet = input.snippetPlain.trim()
  let hashtags = input.hashtagsLine.trim()
  if (platform === 'instagram') {
    hashtags = limitHashtagLine(hashtags, INSTAGRAM_HASHTAG_MAX)
  }

  let article = includeArticle ? input.articleBodyPlain.trim() : ''

  const build = (sn: string, ht: string, art: string) =>
    joinShare(input.title.trim(), input.canonicalUrl, ht, sn, art, includeArticle)

  let text = build(snippet, hashtags, article)
  let guard = 0
  while (effectiveLength(platform, text) > limit && guard < 500) {
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
      return joinShare(
        `${t.slice(0, titleMax).trim()}…`,
        input.canonicalUrl,
        '',
        '',
        '',
        false
      )
    }
    text = build(snippet, hashtags, article)
  }

  return text
}

export function countDisplay (platform: SharePlatformId, text: string): { used: number; limit: number } {
  const limit = platformCopyLimit(platform)
  const used = effectiveLength(platform, text)
  return { used, limit }
}
