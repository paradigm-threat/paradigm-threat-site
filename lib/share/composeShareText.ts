import type { SharePlatformId } from '@/lib/share/platformLimits'
import { X_URL_WEIGHT } from '@/lib/share/platformLimits'

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
