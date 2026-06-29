import type { SharePlatformId } from '@/lib/share/platformLimits'
import {
  BLUESKY_MAX,
  NEXTDOOR_SHARE_BODY_MAX,
  TRUTHSOCIAL_TEXT_MAX,
  THREADS_MAX,
  X_MAX,
  X_URL_WEIGHT,
  limitHashtagsLine,
  platformHashtagLimit,
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

/** Collapse whitespace the same way {@link markdownToPlainBody} does for prefix comparison. */
function normalizeSharePlain (text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * When snippet is the deck/first paragraph and article is the full collapsed body,
 * drop the repeated opening from article so compose emits the deck once.
 */
export function stripSnippetPrefixFromArticle (snippet: string, article: string): string {
  const s = snippet.trim()
  const a = article.trim()
  if (!s || !a) return a

  const ns = normalizeSharePlain(s)

  if (a.includes('\n\n')) {
    const paras = a.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    if (paras.length > 0 && normalizeSharePlain(paras[0]) === ns) {
      const rest = paras.slice(1).join('\n\n').trim()
      return rest || ''
    }
  }

  const na = normalizeSharePlain(a)
  if (!na.startsWith(ns)) return a

  return na.slice(ns.length).trim()
}

/** Inserted above URLs when modal copy is trimmed for Facebook. */
export const READ_FULL_ARTICLE_LINE = 'Read full article'

export interface ComposeShareInput {
  title: string
  canonicalUrl: string
  snippetPlain: string
  hashtagsLine: string
  articleBodyPlain: string
  /** Optional published Substack mirror URL; rendered on its own line below the canonical URL. */
  substackUrl?: string
}

/** URL passed to outbound share intents (`url=` params and in-app open links). */
export function resolveOutboundShareUrl (
  canonicalUrl: string,
  substackUrl: string | undefined,
  preferSubstack: boolean
): string {
  const substack = (substackUrl || '').trim()
  if (preferSubstack && substack) return substack
  return canonicalUrl.trim()
}

/**
 * Compose input for outbound share intents only — copy/paste modal keeps the full {@link ComposeShareInput}.
 * When preferring Substack, promote it to canonical and drop the duplicate mirror line.
 */
export function composeInputForOutboundShare (
  input: ComposeShareInput,
  preferSubstack: boolean
): ComposeShareInput {
  const substack = (input.substackUrl || '').trim()
  const canonical = input.canonicalUrl.trim()
  if (preferSubstack && substack && substack !== canonical) {
    return { ...input, canonicalUrl: substack, substackUrl: undefined }
  }
  return input
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
 * Full share text, no truncation.
 * Order: title → snippet → article body → canonical URL → (optional Substack URL) → hashtags.
 * Per-platform hashtag caps (e.g. Instagram's copy limit) are honored.
 */
export function composeShareText (platform: SharePlatformId, input: ComposeShareInput): string {
  const title = input.title.trim()
  const hashtags = limitHashtagsLine(input.hashtagsLine.trim(), platformHashtagLimit(platform))
  const url = input.canonicalUrl.trim()
  const substack = (input.substackUrl || '').trim()
  const snippet = input.snippetPlain.trim()
  const article = input.articleBodyPlain.trim()

  return joinShareParts(title, hashtags, url, snippet, article, { substackUrl: substack })
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
  opts?: { includeCanonicalUrl?: boolean; substackUrl?: string; readFullArticleLine?: string }
): string {
  const includeUrl = opts?.includeCanonicalUrl !== false
  const substack = (opts?.substackUrl || '').trim()
  const readMore = (opts?.readFullArticleLine || '').trim()
  const parts: string[] = [title]
  if (snippet) parts.push('', snippet)
  const articleDeduped = stripSnippetPrefixFromArticle(snippet, article)
  if (articleDeduped) parts.push('', articleDeduped)
  if (readMore) parts.push('', readMore)
  if (includeUrl) parts.push('', url)
  if (substack && substack !== url) {
    if (!includeUrl) parts.push('')
    parts.push(substack)
  }
  if (hashtags) parts.push('', hashtags)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function effectiveLengthPlatform (platform: SharePlatformId, text: string): number {
  if (platform === 'x' || platform === 'threads') return effectiveLengthX(text)
  return text.length
}

/** Platforms that pass full copy into a query param; must stay within compose limits. */
export function platformUsesTruncatedOutboundIntent (platform: SharePlatformId): boolean {
  return (
    platform === 'x' ||
    platform === 'threads' ||
    platform === 'bluesky' ||
    platform === 'truthsocial' ||
    platform === 'nextdoor'
  )
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
    case 'nextdoor':
      return NEXTDOOR_SHARE_BODY_MAX
    default:
      return null
  }
}

/**
 * Shortened text for intent URLs only (X, Threads, Bluesky, Truth Social).
 * Same block order as composeShareText; trims article → snippet → substack URL → hashtags → title last resort.
 */
export function truncateShareTextForOutbound (
  platform: SharePlatformId,
  input: ComposeShareInput
): string {
  const limit = outboundIntentLimit(platform)
  let title = input.title.trim()
  let hashtags = limitHashtagsLine(input.hashtagsLine.trim(), platformHashtagLimit(platform))
  let url = input.canonicalUrl.trim()
  let substackUrl = (input.substackUrl || '').trim()
  let snippet = input.snippetPlain.trim()
  let article = input.articleBodyPlain.trim()

  const omitUrlInBody = platformUsesSeparateUrlInShareIntent(platform)
  if (omitUrlInBody) {
    snippet = dedupeCanonicalUrlInPlainText(snippet, url)
    article = dedupeCanonicalUrlInPlainText(article, url)
  }
  const buildOpts = () => ({
    includeCanonicalUrl: !omitUrlInBody,
    substackUrl,
  })

  if (limit == null) {
    return joinShareParts(title, hashtags, url, snippet, article, buildOpts())
  }

  const measure = (s: string) => effectiveLengthPlatform(platform, s)

  let text = joinShareParts(title, hashtags, url, snippet, article, buildOpts())
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
    } else if (substackUrl) {
      // Drop the substack mirror URL before sacrificing tags or title — canonical URL stays.
      substackUrl = ''
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
    text = joinShareParts(title, hashtags, url, snippet, article, buildOpts())
  }

  return text
}

function trimArticleChunk (
  article: string,
  preserveParagraphs: boolean
): string {
  if (!article) return ''
  if (preserveParagraphs && article.includes('\n\n')) {
    const paras = article.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    if (paras.length > 1) return paras.slice(0, -1).join('\n\n')
    const only = paras[0] || article
    if (only.length <= 80) return ''
    const trimmed = only.slice(0, Math.max(0, only.length - 120)).trim()
    return trimmed.length > 0 && !trimmed.endsWith('…') ? `${trimmed}…` : trimmed
  }
  if (article.length > 80) {
    const trimmed = article.slice(0, Math.max(0, article.length - 120)).trim()
    return trimmed.length > 0 && !trimmed.endsWith('…') ? `${trimmed}…` : trimmed
  }
  return ''
}

export interface FitComposeShareOptions {
  /** When set, adds {@link READ_FULL_ARTICLE_LINE} above URLs if output was trimmed. */
  readFullArticleWhenClipped?: boolean
  /** Trim whole paragraphs before mid-paragraph character chops. */
  preserveParagraphs?: boolean
}

/**
 * Shrink composed share text to a hard character limit (e.g. Instagram caption 2,200).
 * Same block order as {@link composeShareText}; trims article → snippet → Substack URL →
 * hashtags → title until within `maxChars`. Length is raw string length (paste into app).
 */
export function fitComposeShareToCharLimit (
  platform: SharePlatformId,
  input: ComposeShareInput,
  maxChars: number,
  fitOpts?: FitComposeShareOptions
): string {
  let title = input.title.trim()
  let hashtags = limitHashtagsLine(input.hashtagsLine.trim(), platformHashtagLimit(platform))
  let url = input.canonicalUrl.trim()
  let substackUrl = (input.substackUrl || '').trim()
  let snippet = input.snippetPlain.trim()
  let article = input.articleBodyPlain.trim()
  const preserveParagraphs = fitOpts?.preserveParagraphs === true

  let clipped = false
  const buildOpts = () => ({
    includeCanonicalUrl: true as const,
    substackUrl,
    readFullArticleLine:
      clipped && fitOpts?.readFullArticleWhenClipped ? READ_FULL_ARTICLE_LINE : undefined,
  })

  let text = joinShareParts(title, hashtags, url, snippet, article, buildOpts())
  if (text.length > maxChars) clipped = true
  let guard = 0
  while (text.length > maxChars && guard < 500) {
    guard++
    if (article.length > 80) {
      article = trimArticleChunk(article, preserveParagraphs)
    } else if (article.length > 0) {
      article = ''
    } else if (snippet.length > 20) {
      snippet = snippet.slice(0, Math.max(0, Math.floor(snippet.length * 0.65))).trim() + '…'
    } else if (snippet.length > 0) {
      snippet = ''
    } else if (substackUrl) {
      substackUrl = ''
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
    text = joinShareParts(title, hashtags, url, snippet, article, buildOpts())
  }

  return text
}
