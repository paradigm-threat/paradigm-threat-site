import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import { searchContentFiltersFromInput } from '@/lib/replyAssistant/searchContentFilters'
import { matchSiteClaims } from '@/lib/siteAi/matchSiteClaims'
import { isSiteThesisConfidence, type SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'
import { queryTermsForAndFilter, type SearchContentFilters } from '@/lib/searchIndexFilter'
import { filterAndRankSearchEntries } from '@/lib/search/searchSiteQuery'
import { scoreSearchEntry } from '@/lib/search/searchRankScore'

export type CoverageStatus =
  | 'covered'
  | 'partial'
  | 'tangential'
  | 'not_in_corpus'
  | 'chronology_only'
  | 'open_question'

export type CitableSource = {
  title: string
  url: string
  kind: 'primary' | 'secondary' | 'repo-synthesis'
}

export type SuggestedStep = {
  action: string
  detail?: string
  path?: string
}

export type ResearchEnvelope = {
  coverage: CoverageStatus
  confidence: 'high' | 'medium' | 'low'
  searched: { queries: string[]; toolsCalled: string[] }
  corpusHits: Array<{
    path: string
    title: string
    score: number
    kind: 'article' | 'timeline' | 'claim' | 'other'
  }>
  nearMisses?: Array<{ path: string; title: string; score: number; whyNotUsed: string }>
  gaps: string[]
  doNotSay?: string[]
  citableSources: CitableSource[]
  repoSynthesis?: { allowed: boolean; paths?: string[]; tier?: string }
  mainstream?: { summary: string | null; sourceTier: 'curated' | 'host_may_supplement' | 'unavailable'; note?: string }
  suggestedNextSteps: SuggestedStep[]
  hostMaySupplement?: boolean
  matchedClaimIds?: string[]
}

const SEARCH_COVERED_THRESHOLD = 8
const SEARCH_TANGENTIAL_THRESHOLD = 4
const CLAIM_COVERED_THRESHOLD = 8
const SHORTER_STEM_QUERY_CAP = 24

/** Contiguous keyword windows, longest first, always including every two-word slice. */
export function shorterStemQueries (question: string, maxQueries = SHORTER_STEM_QUERY_CAP): string[] {
  const terms = queryTermsForAndFilter(question)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ''))
    .filter((t) => t.length >= 2)
  if (terms.length < 3) return []

  const bigrams: string[] = []
  for (let i = 0; i + 2 <= terms.length; i++) {
    bigrams.push(terms.slice(i, i + 2).join(' '))
  }

  const out: string[] = []
  const seen = new Set<string>()
  const push = (q: string) => {
    if (seen.has(q) || out.length >= maxQueries) return
    seen.add(q)
    out.push(q)
  }

  const longerBudget = Math.max(maxQueries - bigrams.length, 0)
  for (let len = terms.length - 1; len >= 3 && out.length < longerBudget; len--) {
    for (let i = 0; i + len <= terms.length && out.length < longerBudget; i++) {
      push(terms.slice(i, i + len).join(' '))
    }
  }
  for (const bigram of bigrams) push(bigram)
  return out
}

function adoptBestStemAtLongestLength (
  question: string,
  index: IndexedPathEntry[],
  filters: SearchContentFilters | undefined,
  topScore: number,
): { query: string; hits: IndexedPathEntry[]; score: number } | null {
  const stems = shorterStemQueries(question)
  const byLen = new Map<number, string[]>()
  for (const q of stems) {
    const n = q.split(/\s+/).length
    const bucket = byLen.get(n) ?? []
    bucket.push(q)
    byLen.set(n, bucket)
  }
  const lengths = Array.from(byLen.keys()).sort((a, b) => b - a)
  for (const len of lengths) {
    let best: { query: string; hits: IndexedPathEntry[]; score: number } | null = null
    for (const q of byLen.get(len) ?? []) {
      const hits = filterAndRankSearchEntries(index, q, filters, 5)
      if (!hits.length) continue
      const score = scoreSearchEntry(hits[0]!, q)
      if (score > topScore && (!best || score > best.score)) {
        best = { query: q, hits, score }
      }
    }
    if (best) return best
  }
  return null
}

export type ResearchStatusInput = {
  question: string
  index: IndexedPathEntry[]
  claims: SiteClaimEntry[]
  includeBlog?: boolean
  includeSectionPages?: boolean
  expandKeywords?: boolean
}

export function buildResearchStatus (input: ResearchStatusInput): ResearchEnvelope {
  const question = input.question.trim()
  const toolsCalled = ['research_status']
  const queries = [question]

  if (question.length < 3) {
    return {
      coverage: 'not_in_corpus',
      confidence: 'high',
      searched: { queries, toolsCalled },
      corpusHits: [],
      gaps: ['question must be at least 3 characters'],
      citableSources: [],
      repoSynthesis: { allowed: false },
      mainstream: { summary: null, sourceTier: 'unavailable' },
      suggestedNextSteps: [{ action: 'rephrase_query', detail: 'Provide a longer, more specific question.' }],
      hostMaySupplement: false,
    }
  }

  const matchedClaims = matchSiteClaims(question, { maxResults: 3, claims: input.claims })
  const topClaim = matchedClaims[0]
  const claimCovered = (topClaim?.matchScore ?? 0) >= CLAIM_COVERED_THRESHOLD

  const filters = searchContentFiltersFromInput({
    includeBlog: input.includeBlog ?? false,
    includeSectionPages: input.includeSectionPages ?? true,
  })

  let searchHits = filterAndRankSearchEntries(input.index, question, filters, 10)
  let topSearch = searchHits[0]
  let scoreQuery = question
  let topScore = topSearch ? scoreSearchEntry(topSearch, scoreQuery) : 0
  let usedShorterStem = false

  if (topScore < SEARCH_TANGENTIAL_THRESHOLD && input.expandKeywords !== false) {
    const stem = adoptBestStemAtLongestLength(question, input.index, filters, topScore)
    if (stem) {
      toolsCalled.push('shorter_stem_search')
      if (!queries.includes(stem.query)) queries.push(stem.query)
      searchHits = stem.hits
      topSearch = stem.hits[0]
      scoreQuery = stem.query
      topScore = stem.score
      usedShorterStem = true
    }
  }

  toolsCalled.push('search_site', 'get_site_claims')

  const corpusHits = [
    ...matchedClaims.map((c) => ({
      path: c.canonicalPaths[0] ?? c.id,
      title: c.title,
      score: c.matchScore,
      kind: 'claim' as const,
    })),
    ...searchHits.slice(0, 5).map((e) => ({
      path: e.path,
      title: searchEntryTitle(e),
      score: scoreSearchEntry(e, scoreQuery),
      kind: (e.path.startsWith('timeline/')
        ? 'timeline'
        : /\.(md|mdx)$/i.test(e.path) ? 'article' : 'other') as 'timeline' | 'article' | 'other',
    })),
  ]

  const nearMisses = searchHits
    .slice(0, 3)
    .filter((e) => {
      const s = scoreSearchEntry(e, scoreQuery)
      return s > 0 && s < SEARCH_TANGENTIAL_THRESHOLD
    })
    .map((e) => ({
      path: e.path,
      title: searchEntryTitle(e),
      score: scoreSearchEntry(e, scoreQuery),
      whyNotUsed: 'below relevance threshold',
    }))

  const doNotSay = matchedClaims.flatMap((c) => c.doNotSay ?? [])
  const repoPaths = [
    ...matchedClaims.flatMap((c) => c.canonicalPaths),
    ...searchHits.slice(0, 3).map((e) => e.path),
  ]
  const uniqueRepoPaths = Array.from(new Set(repoPaths)).slice(0, 5)

  let coverage: CoverageStatus = 'not_in_corpus'
  let confidence: ResearchEnvelope['confidence'] = 'high'

  if (claimCovered && topScore >= SEARCH_COVERED_THRESHOLD) {
    coverage = 'covered'
    confidence = 'high'
  } else if (claimCovered || topScore >= SEARCH_COVERED_THRESHOLD) {
    coverage = 'partial'
    confidence = 'medium'
  } else if (topScore >= SEARCH_TANGENTIAL_THRESHOLD || matchedClaims.length > 0 || usedShorterStem) {
    coverage = 'tangential'
    confidence = 'medium'
  } else if (topSearch?.path.startsWith('timeline/')) {
    coverage = 'chronology_only'
    confidence = 'medium'
  }

  const gaps: string[] = []
  if (!claimCovered) gaps.push('No high-confidence site-claim card matches this question')
  if (topScore < SEARCH_COVERED_THRESHOLD) gaps.push('No strong keyword search hit in corpus')
  if (coverage === 'not_in_corpus') gaps.push('No investigation or claim indexed for this exact topic')

  const repoSynthesisAllowed = matchedClaims.some(
    (c) => c.uniqueness === 'site-distinctive' || isSiteThesisConfidence(c.confidence),
  )

  const suggestedNextSteps: SuggestedStep[] = []
  if (coverage === 'not_in_corpus' || coverage === 'tangential') {
    suggestedNextSteps.push({ action: 'rephrase_query', detail: 'Try narrower keywords or event names' })
    if (usedShorterStem && topSearch) {
      suggestedNextSteps.push({ action: 'read_article', path: topSearch.path })
    }
    if (nearMisses[0]) {
      suggestedNextSteps.push({ action: 'read_near_miss', path: nearMisses[0].path, detail: nearMisses[0].title })
    }
    suggestedNextSteps.push({ action: 'external_search', detail: 'MCP does not search the open web for primaries' })
    if (!usedShorterStem) {
      suggestedNextSteps.push({ action: 'submit_investigation_idea', detail: 'Request coverage if topic should be in corpus' })
    }
  } else if (topSearch) {
    suggestedNextSteps.push({ action: 'read_article', path: topSearch.path })
  }
  if (topClaim) {
    suggestedNextSteps.push({ action: 'get_site_claims', detail: topClaim.id })
  }

  return {
    coverage,
    confidence,
    searched: { queries, toolsCalled },
    corpusHits,
    nearMisses: nearMisses.length ? nearMisses : undefined,
    gaps,
    doNotSay: doNotSay.length ? doNotSay : undefined,
    citableSources: [],
    repoSynthesis: {
      allowed: repoSynthesisAllowed,
      paths: repoSynthesisAllowed ? uniqueRepoPaths : undefined,
      tier: topClaim?.confidence,
    },
    mainstream: {
      summary: topClaim?.answerOpener ?? null,
      sourceTier: 'unavailable',
      note: 'No curated Scaligerian summary in site-claims for this topic unless mainstreamSummary is authored',
    },
    suggestedNextSteps,
    hostMaySupplement: coverage === 'not_in_corpus' || coverage === 'tangential',
    matchedClaimIds: matchedClaims.map((c) => c.id),
  }
}

export function getChronologyFramework (): Record<string, unknown> {
  return {
    frames: {
      scaligerian: 'Conventional textbook chronology — challenged default; curated per event when available',
      nc: 'New Chronology (Fomenko) — statistical duplication / phantom centuries',
      project: 'Signed-year timeline in Relay events catalog (NC + Saturnian synthesis)',
      blip: {
        interval: { start: -670, end: 1053 },
        phantomYears: 1723,
        note: '670 BCE, 1 CE, and 1053 CE name one transition in project thesis',
      },
    },
    elapsed: {
      blipAdjustment: 'Subtract overlap with [-670, 1053] for BCE→present spans when computing years ago',
      solarYearDays: 365.25,
    },
    agentNote: getProjectPerspective().split('\n').slice(0, 3).join(' '),
  }
}
