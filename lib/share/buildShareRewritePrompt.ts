import type { SharePlatformId } from '@/lib/share/platformLimits'
import { platformCopyLimit, platformModalCopyLimit } from '@/lib/share/platformLimits'

export type ShareRewriteTone = 'conversational' | 'neutral' | 'brief'

const PLATFORM_LABELS: Record<SharePlatformId, string> = {
  x: 'X (Twitter)',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  bluesky: 'Bluesky',
  instagram: 'Instagram',
  substack: 'Substack Notes',
  threads: 'Threads',
  truthsocial: 'Truth Social',
  nextdoor: 'Nextdoor',
}

function toneGuidance (tone: ShareRewriteTone): string {
  switch (tone) {
    case 'brief':
      return 'Keep it tight: lead with the hook, minimal filler, short paragraphs or single block.'
    case 'neutral':
      return 'Informative and direct — no hype, no engagement bait.'
    default:
      return 'Conversational and readable — like a sharp friend explaining why this article matters.'
  }
}

export function shareRewriteCharLimit (platform: SharePlatformId): number {
  return platformModalCopyLimit(platform) ?? platformCopyLimit(platform)
}

export function buildShareRewriteSystemPrompt (tone: ShareRewriteTone): string {
  return [
    'You rewrite paradigm-threat.net article share captions for social platforms.',
    'Output ONLY the final caption text — ready to paste. No markdown, no quotes, no preamble.',
    '',
    toneGuidance(tone),
    '',
    'Rules:',
    '- Write complete sentences only — never end mid-thought or with an ellipsis unless the platform limit forces it.',
    '- Fix confusing phrasing, jargon without context, and any text that reads like a truncated excerpt.',
    '- Ground the caption in the full article provided — do not invent facts or citations.',
    '- Preserve the article title as the opening line unless the platform limit makes that impossible.',
    '- Keep canonical URL, optional Substack mirror URL, and hashtags on their own lines at the end when provided.',
    '- Stay within the character limit given in the user message (count every character including newlines).',
    '- Do not add "Read more" or engagement CTAs unless the template already had them.',
  ].join('\n')
}

export type BuildShareRewriteUserPromptInput = {
  platform: SharePlatformId
  title: string
  canonicalUrl: string
  substackUrl?: string
  hashtagsLine: string
  articlePlain: string
  templateCopy: string
  maxChars: number
}

export function buildShareRewriteUserPrompt (input: BuildShareRewriteUserPromptInput): string {
  const platformLabel = PLATFORM_LABELS[input.platform] ?? input.platform
  const substack = (input.substackUrl || '').trim()
  const hashtags = input.hashtagsLine.trim()

  return [
    `Platform: ${platformLabel}`,
    `Character limit: ${input.maxChars} (hard max — trim body before dropping title or URL)`,
    '',
    '## Article title',
    input.title.trim(),
    '',
    '## Canonical URL (include on its own line near the end)',
    input.canonicalUrl.trim(),
    ...(substack
      ? ['', '## Substack mirror URL (include on its own line after canonical URL if space allows)', substack]
      : []),
    ...(hashtags
      ? ['', '## Hashtags (include on the last line, space-separated)', hashtags]
      : []),
    '',
    '## Full article (plain text)',
    input.articlePlain.trim(),
    '',
    '## Current template copy (may be truncated or awkward — rewrite it)',
    input.templateCopy.trim(),
    '',
    'Rewrite the template into a polished share caption for this platform.',
    'Use the full article above — not only the truncated template.',
  ].join('\n')
}
