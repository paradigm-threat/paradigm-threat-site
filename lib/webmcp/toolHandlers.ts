import type { CallToolResult } from '@mcp-b/webmcp-types'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import { pickRandomFeelingLuckyHref } from '@/lib/clientMergedSearchIndex'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'
import { filterEntriesByPathQueries, hrefForSearchQuery } from '@/lib/pathSearchQuery'
import { expandSearchKeywords } from '@/lib/replyAssistant/expandKeywords'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import {
  draftReplyToText,
  searchContentFiltersFromInput,
} from '@/lib/replyAssistant/draftReply'
import { entryDisplayTitle } from '@/lib/replyAssistant/rankForText'
import {
  composeShareText,
  extractShareMetadata,
  type SharePlatformId,
} from '@/lib/share'
import { platformModalCopyLimit } from '@/lib/share/platformLimits'
import {
  filterIndexedEntriesByQuery,
} from '@/lib/searchIndexFilter'
import { searchPathForQuery } from '@/lib/useSearchUrlState'
import { fetchArticleMarkdown } from '@/lib/webmcp/fetchArticle'
import { getWebMcpSearchIndex } from '@/lib/webmcp/indexStore'
import {
  getSearchFiltersState,
  setSearchFiltersState,
} from '@/lib/webmcp/searchFiltersState'
import { toolErrorResult, toolJsonResult } from '@/lib/webmcp/toolResult'
import { isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'

async function loadIndex (): Promise<IndexedPathEntry[] | null> {
  const entries = await getWebMcpSearchIndex()
  if (!entries?.length) return null
  return entries
}

function indexUnavailable (): CallToolResult {
  return toolErrorResult('Search index unavailable — Relay mirrors may be offline')
}

function parseBool (v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  return fallback
}

function parseIntBounded (v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

export async function executeSearchSite (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const query = String(args.query ?? '').trim()
  if (query.length < 2) return toolErrorResult('query must be at least 2 characters')

  const filters = searchContentFiltersFromInput({
    includeBlog: parseBool(args.includeBlog, false),
    includeSectionPages: parseBool(args.includeSectionPages, false),
  })
  const limit = parseIntBounded(args.limit, 20, 1, 50)
  const hits = filterIndexedEntriesByQuery(index, query, filters).slice(0, limit)

  return toolJsonResult({
    query,
    count: hits.length,
    results: hits.map((e) => ({
      path: e.path,
      title: entryDisplayTitle(e),
      kind: e.path.startsWith('timeline/') ? 'timeline' : /\.(md|mdx)$/i.test(e.path) ? 'article' : 'other',
    })),
  })
}

export async function executeSuggestSearchFromPath (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const path = String(args.path ?? '').trim()
  if (!path) return toolErrorResult('path is required')

  const { results, queryUsed, linkQuery } = filterEntriesByPathQueries(index, path)
  return toolJsonResult({
    suggestedQuery: linkQuery,
    queryUsed,
    rankedPaths: results.slice(0, 20).map((e) => e.path),
    confidence: results.length > 0 ? 'medium' : 'low',
  })
}

export async function executeGetArticleContext (args: Record<string, unknown>): Promise<CallToolResult> {
  const path = String(args.path ?? '').trim()
  if (!path) return toolErrorResult('path is required')
  const includeBodyPreview = parseBool(args.includeBodyPreview, false)

  const md = await fetchArticleMarkdown(path)
  if (!md) {
    return toolErrorResult(`Could not load markdown for path: ${path}`)
  }

  const meta = extractShareMetadata({ rawMarkdown: md })
  const title = meta.snippetPlain.split('\n')[0] || entryDisplayTitle({ path, searchText: path })

  return toolJsonResult({
    path,
    canonicalUrl: pathToCanonicalUrl(path),
    title,
    snippetPlain: meta.snippetPlain,
    hashtagsLine: meta.hashtagsLine,
    substackUrl: meta.substackUrl,
    bodyPreview: includeBodyPreview ? meta.articleBodyPlain.slice(0, 800) : undefined,
  })
}

export async function executeComposeShareText (args: Record<string, unknown>): Promise<CallToolResult> {
  const path = String(args.path ?? '').trim()
  const platform = String(args.platform ?? 'plain') as SharePlatformId
  if (!path) return toolErrorResult('path is required')

  const md = await fetchArticleMarkdown(path)
  if (!md) return toolErrorResult(`Could not load markdown for path: ${path}`)

  const meta = extractShareMetadata({ rawMarkdown: md })
  const title = entryDisplayTitle({ path, searchText: path })
  const canonicalUrl = pathToCanonicalUrl(path)
  const variant = String(args.variant ?? 'full')

  let text = composeShareText(platform, {
    title,
    canonicalUrl,
    snippetPlain: meta.snippetPlain,
    hashtagsLine: meta.hashtagsLine,
    articleBodyPlain: meta.articleBodyPlain,
    substackUrl: meta.substackUrl,
  })

  if (variant === 'snippet_only') {
    text = composeShareText(platform, {
      title,
      canonicalUrl,
      snippetPlain: meta.snippetPlain,
      hashtagsLine: meta.hashtagsLine,
      articleBodyPlain: '',
      substackUrl: meta.substackUrl,
    })
  } else if (variant === 'title_url_only') {
    text = `${title}\n\n${canonicalUrl}`
  } else if (variant === 'alternate_hook') {
    const hook = meta.articleBodyPlain.split(/\s+/).slice(0, 40).join(' ')
    text = `${title}\n\n${hook}`.trim()
  }

  const maxLength = args.maxLength
  if (typeof maxLength === 'number' && maxLength > 0 && text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1)}…`
  }

  return toolJsonResult({
    text,
    charCount: text.length,
    platform,
    variant,
    limit: platformModalCopyLimit(platform),
  })
}

export function executeListSearchFilters (): CallToolResult {
  const filters = getSearchFiltersState()
  return toolJsonResult({
    filters,
    availableToggles: ['includeBlog', 'includeSectionPages'],
  })
}

export async function executeExpandSearchKeywords (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const query = String(args.query ?? '').trim()
  if (query.length < 2) return toolErrorResult('query must be at least 2 characters')

  const filters = searchContentFiltersFromInput({
    includeBlog: parseBool(args.includeBlog, false),
    includeSectionPages: parseBool(args.includeSectionPages, false),
  })
  const limit = parseIntBounded(args.limit, 12, 1, 30)
  const { related, entriesMatched } = expandSearchKeywords(index, query, filters, limit)
  return toolJsonResult({ query, related, entriesMatched })
}

export function executeNavigateToResult (args: Record<string, unknown>): CallToolResult {
  const path = String(args.path ?? '').trim()
  if (!path) return toolErrorResult('path is required')
  const href = feelingLuckyPathToHref(path.replace(/^\//, ''))
  const url = pathToCanonicalUrl(path)
  const navigate = parseBool(args.navigate, false)
  if (navigate && typeof window !== 'undefined') {
    window.location.assign(href.startsWith('/') ? href : `/${href}`)
  }
  return toolJsonResult({ path, href, url, navigated: navigate })
}

export function executeOpenTimelineEvent (args: Record<string, unknown>): CallToolResult {
  const id = String(args.id ?? args.eventId ?? '').trim()
  if (!id) return toolErrorResult('id is required')
  const path = `timeline/${id}`
  return toolJsonResult({
    id,
    path,
    url: pathToCanonicalUrl(path),
    deepLink: `/timeline?event=${encodeURIComponent(id)}`,
  })
}

export async function executeFeelingLucky (): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const href = pickRandomFeelingLuckyHref(index)
  if (!href) return toolErrorResult('No feeling-lucky candidates in index')
  return toolJsonResult({ href, url: pathToCanonicalUrl(href.replace(/^\//, '')) })
}

export function executeSetSearchFilters (args: Record<string, unknown>): CallToolResult {
  const next = setSearchFiltersState({
    includeBlog: args.includeBlog !== undefined ? parseBool(args.includeBlog, false) : undefined,
    includeNonArticleMd: args.includeSectionPages !== undefined
      ? parseBool(args.includeSectionPages, false)
      : undefined,
  })
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (query && typeof window !== 'undefined') {
    window.location.assign(searchPathForQuery(query))
  }
  return toolJsonResult({ filters: next, queryApplied: query || null })
}

export async function executeFindArticlesForText (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const sourceText = String(args.sourceText ?? '')
  const result = findArticlesForText(index, {
    sourceText,
    maxArticles: parseIntBounded(args.maxArticles, 5, 1, 10),
    includeBlog: parseBool(args.includeBlog, false),
    includeCitations: parseBool(args.includeCitations, false),
  })
  return toolJsonResult(result)
}

export async function executeDraftReplyToText (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const sourceText = String(args.sourceText ?? '')
  const result = await draftReplyToText(
    index,
    {
      sourceText,
      maxArticles: parseIntBounded(args.maxArticles, 3, 1, 10),
      includeCitations: parseBool(args.includeCitations, false),
      citationStyle: (args.citationStyle as 'inline' | 'footer' | 'markdown') ?? 'footer',
      tone: (args.tone as 'neutral' | 'conversational' | 'brief') ?? 'conversational',
      maxLength: typeof args.maxLength === 'number' ? args.maxLength : undefined,
      includeBlog: parseBool(args.includeBlog, false),
    },
    fetchArticleMarkdown
  )
  return toolJsonResult(result)
}

export async function executeCopyToClipboard (args: Record<string, unknown>): Promise<CallToolResult> {
  if (!isWebMcpActuationEnabled()) {
    return toolErrorResult('copy_to_clipboard requires NEXT_PUBLIC_WEBMCP_ACTUATION=1')
  }
  const text = String(args.text ?? '')
  if (!text) return toolErrorResult('text is required')
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return toolErrorResult('Clipboard API unavailable')
  }
  try {
    await navigator.clipboard.writeText(text)
    return toolJsonResult({ copied: true, charCount: text.length })
  } catch (e) {
    return toolErrorResult(e instanceof Error ? e.message : 'Clipboard write failed')
  }
}

export function hrefForSearchQueryExport (query: string): string {
  return hrefForSearchQuery(query)
}
