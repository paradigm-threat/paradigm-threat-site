import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { pathToCanonicalUrl } from '@/lib/canonicalPageUrl'
import { readArticleContentFromMarkdown } from '@/lib/replyAssistant/readArticleContent'
import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import { searchContentFiltersFromInput } from '@/lib/replyAssistant/searchContentFilters'
import { matchSiteClaims } from '@/lib/siteAi/matchSiteClaims'
import { getSiteClaimByIdFromList } from '@/lib/mcp/siteClaimsUtil'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'
import { filterAndRankSearchEntries } from '@/lib/search/searchSiteQuery'
import { scoreSearchEntry } from '@/lib/search/searchRankScore'
import { extractShareMetadata } from '@/lib/share'
import {
  buildResearchStatus,
  getChronologyFramework,
  type ResearchEnvelope,
} from '@/lib/mcp/researchEnvelope'
import {
  fetchArticleMarkdownServer,
  fetchMergedSearchIndexServer,
  fetchSiteClaimsServer,
} from '@/lib/mcp/relayFetch'
import {
  calendarYearsElapsed,
  formatDateRange,
  formatElapsedForSignedStart,
  getEventYear,
} from '@/components/Timeline/utils'
import { fetchTimelineEventsServer, findTimelineEventById } from '@/lib/mcp/timelineServer'

function parseBool (v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  return fallback
}

function parseIntBounded (v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

async function loadIndex (): Promise<IndexedPathEntry[] | null> {
  return fetchMergedSearchIndexServer()
}

export async function mcpSearchSite (args: Record<string, unknown>) {
  const index = await loadIndex()
  if (!index) return { error: 'Search index unavailable — Relay mirrors may be offline' }

  const query = String(args.query ?? '').trim()
  if (query.length < 2) return { error: 'query must be at least 2 characters' }

  const filters = searchContentFiltersFromInput({
    includeBlog: parseBool(args.includeBlog, false),
    includeSectionPages: parseBool(args.includeSectionPages, true),
  })
  const limit = parseIntBounded(args.limit, 20, 1, 50)
  const hits = filterAndRankSearchEntries(index, query, filters, limit)

  return {
    query,
    count: hits.length,
    results: hits.map((e) => ({
      path: e.path,
      title: searchEntryTitle(e),
      score: scoreSearchEntry(e, query),
      kind: e.path.startsWith('timeline/') ? 'timeline' : /\.(md|mdx)$/i.test(e.path) ? 'article' : 'other',
    })),
  }
}

export async function mcpGetSiteClaims (args: Record<string, unknown>) {
  const claims = await fetchSiteClaimsServer()
  if (!claims?.length) return { error: 'site-claims.json unavailable' }

  const id = typeof args.id === 'string' ? args.id.trim() : ''
  if (id) {
    const one = getSiteClaimByIdFromList(claims, id)
    if (!one) return { error: `No claim with id: ${id}` }
    return { claims: [one] }
  }

  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (query.length >= 3) {
    return { claims: matchSiteClaims(query, { maxResults: 3, claims }) }
  }

  return { error: 'Provide query (min 3 chars) or id' }
}

export function mcpGetProjectPerspective () {
  return { perspective: getProjectPerspective() }
}

export async function mcpGetArticleContext (args: Record<string, unknown>) {
  const path = String(args.path ?? '').trim()
  if (!path) return { error: 'path is required' }

  const md = await fetchArticleMarkdownServer(path)
  if (!md) return { error: `Could not load markdown for path: ${path}` }

  const meta = extractShareMetadata({ rawMarkdown: md })
  return {
    path,
    canonicalUrl: pathToCanonicalUrl(path),
    title: meta.snippetPlain.split('\n')[0] || searchEntryTitle({ path, searchText: path }),
    snippetPlain: meta.snippetPlain,
    hashtagsLine: meta.hashtagsLine,
    substackUrl: meta.substackUrl,
    bodyPreview: parseBool(args.includeBodyPreview, false) ? meta.articleBodyPlain.slice(0, 800) : undefined,
  }
}

export async function mcpReadArticle (args: Record<string, unknown>) {
  const path = String(args.path ?? '').trim()
  if (!path) return { error: 'path is required' }

  const md = await fetchArticleMarkdownServer(path)
  if (!md) return { error: `Could not load markdown for path: ${path}` }

  const offset = parseIntBounded(args.offset, 0, 0, 1_000_000)
  const limit = parseIntBounded(args.limit, 12_000, 500, 40_000)
  const content = readArticleContentFromMarkdown(md, { offset, limit })

  return {
    path,
    canonicalUrl: pathToCanonicalUrl(path),
    ...content,
  }
}

export async function mcpResearchStatus (args: Record<string, unknown>): Promise<ResearchEnvelope & { error?: string }> {
  const question = String(args.question ?? args.query ?? '').trim()
  const index = await loadIndex()
  const claims = await fetchSiteClaimsServer()

  if (!index) {
    return {
      coverage: 'not_in_corpus',
      confidence: 'low',
      searched: { queries: [question], toolsCalled: ['research_status'] },
      corpusHits: [],
      gaps: ['Relay index unavailable'],
      citableSources: [],
      suggestedNextSteps: [{ action: 'retry', detail: 'Relay mirrors may be offline' }],
      mainstream: { summary: null, sourceTier: 'unavailable' },
      error: 'index unavailable',
    }
  }

  return buildResearchStatus({
    question,
    index,
    claims: claims ?? [],
    includeBlog: parseBool(args.includeBlog, false),
    expandKeywords: parseBool(args.expandKeywords, true),
    includeSectionPages: parseBool(args.includeSectionPages, true),
  })
}

export function mcpGetChronologyFramework () {
  return getChronologyFramework()
}

export async function mcpComputeYearsAgo (args: Record<string, unknown>) {
  const refYear = parseIntBounded(args.refYear, new Date().getFullYear(), 1, 3000)
  const nowMs = Date.now()
  const blipAdjust = parseBool(args.blipAdjust, true)

  const eventId = typeof args.eventId === 'string' ? args.eventId.trim() : ''
  if (eventId) {
    const evt = await findTimelineEventById(eventId)
    if (!evt) return { error: `Unknown eventId: ${eventId}` }
    const start = getEventYear(evt)
    if (start == null) return { error: 'Event has no start year' }
    const formatted = formatElapsedForSignedStart(start, refYear, nowMs)
    return {
      eventId,
      title: evt.title,
      signedYear: start,
      dateLabel: formatDateRange(evt),
      elapsedLabel: formatted,
      refYear,
    }
  }

  const signedYear = typeof args.signedYear === 'number'
    ? args.signedYear
    : Number(args.year)
  if (!Number.isFinite(signedYear)) return { error: 'Provide signedYear (negative=BCE) or eventId' }

  const elapsedLabel = formatElapsedForSignedStart(signedYear, refYear, nowMs)
  const calendarYears = calendarYearsElapsed(signedYear, refYear)

  return {
    signedYear,
    elapsedLabel: blipAdjust ? elapsedLabel : `~${calendarYears?.toLocaleString('en-US') ?? '?'} calendar years`,
    calendarYears,
    refYear,
  }
}

export async function mcpGetEventDates (args: Record<string, unknown>) {
  const eventId = String(args.eventId ?? '').trim()
  const titleQuery = String(args.titleQuery ?? '').trim()

  let evt = eventId ? await findTimelineEventById(eventId) : null
  if (!evt && titleQuery.length >= 2) {
    const index = await loadIndex()
    const timelineHits = (index ?? []).filter((e) => e.path.startsWith('timeline/'))
    const q = titleQuery.toLowerCase()
    const match = timelineHits.find((e) => e.searchText.toLowerCase().includes(q))
    if (match) {
      const id = match.path.replace(/^timeline\//, '')
      evt = await findTimelineEventById(id)
    }
  }

  if (!evt) return { error: 'Event not found — provide eventId or titleQuery' }

  const start = getEventYear(evt)
  const refYear = new Date().getFullYear()
  const nowMs = Date.now()
  const elapsedLabel = start != null ? formatElapsedForSignedStart(start, refYear, nowMs) : null

  const scaligerian = evt.dates?.find((d) => (d as { source?: string }).source === 'Scaligerian')

  return {
    eventId: evt.id,
    title: evt.title,
    md_path: evt.md_path,
    dates: {
      project: evt.dates?.[0] ?? null,
      mainstream: scaligerian ?? null,
      all: evt.dates ?? [],
    },
    dateLabel: formatDateRange(evt),
    elapsed: elapsedLabel
      ? { refYear, label: elapsedLabel }
      : null,
    timelineUrl: pathToCanonicalUrl(`timeline/${evt.id}`),
  }
}

export async function mcpFetchTimelineIndex () {
  return fetchTimelineEventsServer()
}
