import type { CallToolResult } from '@mcp-b/webmcp-types'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import { pickRandomFeelingLuckyHref } from '@/lib/clientMergedSearchIndex'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'
import { filterEntriesByPathQueries, hrefForSearchQuery } from '@/lib/pathSearchQuery'
import { expandSearchKeywords } from '@/lib/replyAssistant/expandKeywords'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import { formatCitationBlock, type CitationStyle } from '@/lib/replyAssistant/formatCitations'
import { listIndexEntries } from '@/lib/replyAssistant/listIndexEntries'
import { prepareReplyContext } from '@/lib/replyAssistant/prepareReplyContext'
import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import { getSiteClaimById, getSiteClaimsIndex } from '@/lib/siteAi/siteClaimsIndex'
import { matchSiteClaims } from '@/lib/siteAi/matchSiteClaims'
import { readArticleContentFromMarkdown } from '@/lib/replyAssistant/readArticleContent'
import {
  searchContentFiltersFromInput,
} from '@/lib/replyAssistant/searchContentFilters'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'
import {
  composeShareText,
  extractShareMetadata,
  type SharePlatformId,
} from '@/lib/share'
import { platformModalCopyLimit } from '@/lib/share/platformLimits'
import {
  filterIndexedEntriesByQuery,
} from '@/lib/searchIndexFilter'
import { filterAndRankSearchEntries } from '@/lib/search/searchSiteQuery'
import { scoreSearchEntry } from '@/lib/search/searchRankScore'
import { searchPathForQuery } from '@/lib/useSearchUrlState'
import { fetchArticleMarkdown } from '@/lib/webmcp/fetchArticle'
import { prepareIllustrationFromMarkdown } from '@/lib/illustration/prepareIllustrationPrompt'
import { getWebMcpSearchIndex } from '@/lib/webmcp/indexStore'
import {
  getSearchFiltersState,
  setSearchFiltersState,
} from '@/lib/webmcp/searchFiltersState'
import { toolErrorResult, toolJsonResult } from '@/lib/webmcp/toolResult'
import { postInvestigationSubmission } from '@/lib/investigationSubmission/clientSubmit'
import { parseInvestigationSubmissionBody } from '@/lib/investigationSubmission/validateSubmission'
import { isInvestigationSubmitEnabled, isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'
import { putComment } from '@/lib/chat/relayChatClient'
import { parseChatSubmissionBody } from '@/lib/chatSubmission/validateSubmission'
import { checkChatSubmitRateLimit } from '@/lib/chatSubmission/rateLimit'

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
  const hits = filterAndRankSearchEntries(index, query, filters, limit)

  return toolJsonResult({
    query,
    count: hits.length,
    results: hits.map((e) => ({
      path: e.path,
      title: searchEntryTitle(e),
      score: scoreSearchEntry(e, query),
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
  const title = meta.snippetPlain.split('\n')[0] || searchEntryTitle({ path, searchText: path })

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
  const title = searchEntryTitle({ path, searchText: path })
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

export function executeGetProjectPerspective (): CallToolResult {
  return toolJsonResult({
    perspective: getProjectPerspective(),
    summary: 'Paradigm Threat worldview: alternate chronology, Tartaria/mud flood, æther physics, epistemic labeling.',
  })
}

export async function executeGetSiteClaims (args: Record<string, unknown>): Promise<CallToolResult> {
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  const id = typeof args.id === 'string' ? args.id.trim() : ''
  const allClaims = await getSiteClaimsIndex()

  if (id) {
    const claim = getSiteClaimById(id)
    if (!claim) return toolErrorResult(`Unknown claim id: ${id}`)
    return toolJsonResult({ claims: [claim] })
  }

  if (query.length >= 3) {
    const matched = matchSiteClaims(query, { maxResults: 5, claims: allClaims })
    return toolJsonResult({ claims: matched, query })
  }

  return toolJsonResult({
    claims: allClaims,
    summary: `${allClaims.length} curated site claims — pass query or id to narrow.`,
  })
}

export async function executePrepareReplyContext (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const sourceText = String(args.sourceText ?? '')
  const userInstructions = typeof args.userInstructions === 'string'
    ? args.userInstructions.trim()
    : undefined
  const result = prepareReplyContext(index, {
    sourceText,
    maxSeedArticles: parseIntBounded(args.maxSeedArticles, 5, 1, 10),
    includeCitations: parseBool(args.includeCitations, false),
    citationStyle: (args.citationStyle as CitationStyle) ?? 'footer',
    tone: (args.tone as 'neutral' | 'conversational' | 'brief') ?? 'conversational',
    includeBlog: parseBool(args.includeBlog, false),
    userInstructions: userInstructions || undefined,
    siteClaims: await getSiteClaimsIndex(),
  })
  return toolJsonResult(result)
}

export async function executeListIndexEntries (args: Record<string, unknown>): Promise<CallToolResult> {
  const index = await loadIndex()
  if (!index) return indexUnavailable()

  const filters = searchContentFiltersFromInput({
    includeBlog: parseBool(args.includeBlog, false),
    includeSectionPages: parseBool(args.includeSectionPages, false),
  })
  const kind = String(args.kind ?? 'all') as 'article' | 'timeline' | 'other' | 'all'
  const result = listIndexEntries(index, {
    prefix: typeof args.prefix === 'string' ? args.prefix : undefined,
    kind: ['article', 'timeline', 'other', 'all'].includes(kind) ? kind : 'all',
    query: typeof args.query === 'string' ? args.query : undefined,
    limit: parseIntBounded(args.limit, 50, 1, 200),
    includeBlog: parseBool(args.includeBlog, false),
    includeSectionPages: parseBool(args.includeSectionPages, false),
  }, filters)
  return toolJsonResult(result)
}

export async function executeReadArticle (args: Record<string, unknown>): Promise<CallToolResult> {
  const path = String(args.path ?? '').trim()
  if (!path) return toolErrorResult('path is required')

  const md = await fetchArticleMarkdown(path)
  if (!md) return toolErrorResult(`Could not load markdown for path: ${path}`)

  const result = readArticleContentFromMarkdown(path, md, {
    offset: parseIntBounded(args.offset, 0, 0, 500_000),
    maxChars: typeof args.maxChars === 'number' ? args.maxChars : undefined,
    includeRawMarkdown: parseBool(args.includeRawMarkdown, false),
  })
  return toolJsonResult(result)
}

export function executeFormatReplyCitations (args: Record<string, unknown>): CallToolResult {
  const raw = args.articles
  if (!Array.isArray(raw) || raw.length === 0) {
    return toolErrorResult('articles array is required')
  }
  const items = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const title = String(o.title ?? '').trim()
      const url = String(o.url ?? o.canonicalUrl ?? '').trim()
      if (!title || !url) return null
      return { title, url }
    })
    .filter((x): x is { title: string; url: string } => x !== null)

  if (!items.length) return toolErrorResult('articles must include title and url')

  const style = (args.citationStyle as CitationStyle) ?? 'footer'
  const text = formatCitationBlock(items, style)
  return toolJsonResult({ text, citationStyle: style, count: items.length })
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

export async function executeSubmitInvestigationIdea (
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  if (!isInvestigationSubmitEnabled()) {
    return toolErrorResult('Investigation submissions are temporarily unavailable')
  }
  if (typeof window === 'undefined') {
    return toolErrorResult('submit_investigation_idea must run in the browser')
  }

  const sourceRaw = String(args.source ?? 'webmcp').trim()
  const source = sourceRaw === 'site_ai' ? 'site_ai' : 'webmcp'

  const parsed = parseInvestigationSubmissionBody({
    topic: args.topic,
    description: args.description,
    urls: args.urls,
    email: args.email,
    is_anonymous: args.is_anonymous,
    search_query: args.search_query,
    source,
  })
  if (!parsed.ok) return toolErrorResult(parsed.error)

  try {
    const submission = await postInvestigationSubmission(parsed.data)
    return toolJsonResult({
      ok: true,
      id: submission.id,
      topic: submission.topic,
      message: 'Submission saved. It will appear on /submit.',
    })
  } catch (e) {
    return toolErrorResult(e instanceof Error ? e.message : 'Submit failed')
  }
}

export async function executeSubmitChatComment (
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  if (typeof window === 'undefined') {
    return toolErrorResult('submit_chat_comment must run in the browser')
  }
  if (!checkChatSubmitRateLimit('webmcp')) {
    return toolErrorResult('Too many chat posts. Please wait a moment.')
  }

  const parsed = parseChatSubmissionBody({
    channel: args.channel,
    content: args.content,
    author: args.author ?? args.username,
    is_anonymous: args.is_anonymous,
    anonymous: args.anonymous,
    source: 'webmcp',
  })
  if (!parsed.ok) return toolErrorResult(parsed.error)

  try {
    const post = await putComment({
      channel: parsed.data.channel,
      content: parsed.data.content,
      author: parsed.data.author,
      anonymous: parsed.data.anonymous,
      source: 'webmcp',
    })
    return toolJsonResult({
      ok: true,
      id: post.id,
      channel: post.channel,
      message: 'Comment saved to Relay chat.',
    })
  } catch (e) {
    return toolErrorResult(e instanceof Error ? e.message : 'Chat submit failed')
  }
}

export function hrefForSearchQueryExport (query: string): string {
  return hrefForSearchQuery(query)
}

export async function executePrepareIllustrationPrompt (
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const articlePath = String(args.articlePath ?? args.path ?? '').trim().replace(/^\/+/, '')
  if (!articlePath) return toolErrorResult('articlePath is required')
  const slot = String(args.slot ?? 'hero').trim() || 'hero'
  const timeline = parseBool(args.timeline, articlePath.includes('timeline/') || articlePath.includes('content/'))

  let markdown = String(args.markdown ?? '').trim()
  if (!markdown) {
    const md = await fetchArticleMarkdown(articlePath)
    if (!md) return toolErrorResult(`Could not load markdown for path: ${articlePath}`)
    markdown = md
  }

  const prepared = prepareIllustrationFromMarkdown({
    articlePath,
    markdown,
    slot,
    timeline,
    outputExists: false,
  })

  return toolJsonResult({
    ...prepared,
    note: 'Read-only: run cliCommand locally after user approval. Never pass --yes-overwrite without explicit user consent.',
    docs: 'paradigm-threat-files/docs/IMAGE_GENERATION.md',
  })
}
