import {
  buildShareRewriteSystemPrompt,
  buildShareRewriteUserPrompt,
  shareRewriteCharLimit,
  type ShareRewriteTone,
} from '@/lib/share/buildShareRewritePrompt'
import type { SharePlatformId } from '@/lib/share/platformLimits'
import {
  createBrowserLanguageModelSession,
  type ModelSessionProgress,
} from '@/lib/replyAssistant/browserLanguageModel'

const ARTICLE_PLAIN_MAX = 24_000

export type { ShareRewriteTone } from '@/lib/share/buildShareRewritePrompt'
export type DraftShareTextInput = {
  platform: SharePlatformId
  title: string
  canonicalUrl: string
  substackUrl?: string
  hashtagsLine: string
  /** Full article body with paragraph breaks when available */
  articlePlain: string
  templateCopy: string
  tone?: ShareRewriteTone
  signal?: AbortSignal
  onSessionProgress?: (progress: ModelSessionProgress) => void
  onProgress?: (progress: ShareRewriteProgress) => void
}

export type DraftShareTextResult = {
  text: string
  charCount: number
}

export type ShareRewriteProgress = {
  message: string
  /** 0–100 when the model reports download progress; null = indeterminate */
  percent: number | null
}

function trimArticlePlain (articlePlain: string): string {
  const plain = articlePlain.trim()
  if (plain.length <= ARTICLE_PLAIN_MAX) return plain
  return `${plain.slice(0, ARTICLE_PLAIN_MAX).trim()}…\n\n[Article truncated for model context — use the opening sections above.]`
}

export async function draftShareTextWithBrowserAi (
  input: DraftShareTextInput
): Promise<DraftShareTextResult> {
  const tone = input.tone ?? 'conversational'
  const maxChars = shareRewriteCharLimit(input.platform)
  const articlePlain = trimArticlePlain(input.articlePlain)

  if (!articlePlain) {
    throw new Error('Article body is empty — cannot rewrite share text')
  }

  input.onProgress?.({ message: 'Preparing rewrite…', percent: null })

  const systemPrompt = buildShareRewriteSystemPrompt(tone)
  const userPrompt = buildShareRewriteUserPrompt({
    platform: input.platform,
    title: input.title,
    canonicalUrl: input.canonicalUrl,
    substackUrl: input.substackUrl,
    hashtagsLine: input.hashtagsLine,
    articlePlain,
    templateCopy: input.templateCopy,
    maxChars,
  })

  const session = await createBrowserLanguageModelSession(systemPrompt, {
    signal: input.signal,
    onSessionProgress: (progress) => {
      input.onSessionProgress?.(progress)
      if (progress.kind === 'checking') {
        input.onProgress?.({ message: progress.message, percent: null })
      } else if (progress.kind === 'downloading') {
        const percent =
          typeof progress.loaded === 'number' && progress.loaded > 0
            ? Math.min(100, Math.round(progress.loaded * 100))
            : null
        input.onProgress?.({ message: progress.message, percent })
      } else if (progress.kind === 'ready') {
        input.onProgress?.({ message: 'Rewriting caption…', percent: null })
      }
    },
  })

  try {
    input.onProgress?.({ message: 'Rewriting caption…', percent: null })
    const raw = await session.prompt(userPrompt, { signal: input.signal })
    const text = enforceCharLimit(raw.trim(), maxChars)
    return { text, charCount: text.length }
  } finally {
    session.destroy()
  }
}

/** Last-resort trim when the model exceeds the platform limit despite prompt instructions. */
export function enforceCharLimit (text: string, maxChars: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed
  return trimToCharLimit(trimmed, maxChars)
}

function trimToCharLimit (text: string, maxChars: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed
  const slice = trimmed.slice(0, maxChars - 1).trimEnd()
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut}…`
}
