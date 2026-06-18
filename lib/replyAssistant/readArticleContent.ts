import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import { extractShareMetadata } from '@/lib/share'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'

export type ReadArticleContentInput = {
  path: string
  offset?: number
  maxChars?: number
  includeRawMarkdown?: boolean
}

export type ReadArticleContentResult = {
  path: string
  title: string
  canonicalUrl: string
  tldr: string
  keywords: string
  bodyPlain: string
  bodyOffset: number
  bodyLength: number
  totalBodyLength: number
  truncated: boolean
  rawMarkdown?: string
}

const DEFAULT_MAX_CHARS = 12_000
const MIN_CHARS = 500
const MAX_CHARS = 50_000

export function clampReadArticleMaxChars (maxChars?: number): number {
  if (typeof maxChars !== 'number' || !Number.isFinite(maxChars)) return DEFAULT_MAX_CHARS
  return Math.min(MAX_CHARS, Math.max(MIN_CHARS, Math.floor(maxChars)))
}

export function readArticleContentFromMarkdown (
  indexPath: string,
  rawMarkdown: string,
  input: Pick<ReadArticleContentInput, 'offset' | 'maxChars' | 'includeRawMarkdown'>
): ReadArticleContentResult {
  const meta = extractShareMetadata({ rawMarkdown })
  const title = meta.snippetPlain.split('\n')[0]?.trim() ||
    searchEntryTitle({ path: indexPath, searchText: indexPath })
  const bodyPlain = meta.articleBodyPlain || meta.snippetPlain
  const offset = Math.max(0, Math.floor(input.offset ?? 0))
  const maxChars = clampReadArticleMaxChars(input.maxChars)
  const totalBodyLength = bodyPlain.length
  const slice = bodyPlain.slice(offset, offset + maxChars)

  return {
    path: indexPath,
    title,
    canonicalUrl: pathToCanonicalUrl(indexPath),
    tldr: meta.snippetPlain,
    keywords: meta.hashtagsLine,
    bodyPlain: slice,
    bodyOffset: offset,
    bodyLength: slice.length,
    totalBodyLength,
    truncated: offset + slice.length < totalBodyLength,
    rawMarkdown: input.includeRawMarkdown ? rawMarkdown : undefined,
  }
}
