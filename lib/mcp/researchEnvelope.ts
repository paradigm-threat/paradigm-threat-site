import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { expandSearchKeywords } from '@/lib/replyAssistant/expandKeywords'
import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import { searchContentFiltersFromInput } from '@/lib/replyAssistant/searchContentFilters'
import { matchSiteClaims } from '@/lib/siteAi/matchSiteClaims'
import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'
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
  let topScore = topSearch ? scoreSearchEntry(topSearch, question) : 0

  if (topScore < SEARCH_TANGENTIAL_THRESHOLD && input.expandKeywords !== false) {
    const expanded = expandSearchKeywords(input.index, question, filters)
    toolsCalled.push('expand_search_keywords')
    for (const term of expanded.related.slice(0, 3)) {
      const q = `${question} ${term}`.trim()
      if (!queries.includes(q)) queries.push(q)
      const hits = filterAndRankSearchEntries(input.index, q, filters, 5)
      if (hits.length > 0 && scoreSearchEntry(hits[0]!, q) > topScore) {
        searchHits = hits
        topSearch = hits[0]
        topScore = scoreSearchEntry(topSearch, question)
      }
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
      score: scoreSearchEntry(e, question),
      kind: (e.path.startsWith('timeline/')
        ? 'timeline'
        : /\.(md|mdx)$/i.test(e.path) ? 'article' : 'other') as 'timeline' | 'article' | 'other',
    })),
  ]

  const nearMisses = searchHits
    .slice(0, 3)
    .filter((e) => {
      const s = scoreSearchEntry(e, question)
      return s > 0 && s < SEARCH_TANGENTIAL_THRESHOLD
    })
    .map((e) => ({
      path: e.path,
      title: searchEntryTitle(e),
      score: scoreSearchEntry(e, question),
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
  } else if (topScore >= SEARCH_TANGENTIAL_THRESHOLD || matchedClaims.length > 0) {
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
    (c) => c.uniqueness === 'site-distinctive' || c.confidence === 'project-thesis',
  )

  const suggestedNextSteps: SuggestedStep[] = []
  if (coverage === 'not_in_corpus' || coverage === 'tangential') {
    suggestedNextSteps.push({ action: 'rephrase_query', detail: 'Try narrower keywords or event names' })
    if (nearMisses[0]) {
      suggestedNextSteps.push({ action: 'read_near_miss', path: nearMisses[0].path, detail: nearMisses[0].title })
    }
    suggestedNextSteps.push({ action: 'external_search', detail: 'MCP does not search the open web for primaries' })
    suggestedNextSteps.push({ action: 'submit_investigation_idea', detail: 'Request coverage if topic should be in corpus' })
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
