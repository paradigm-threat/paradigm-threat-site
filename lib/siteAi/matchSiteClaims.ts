import { extractTermsFromText } from '@/lib/replyAssistant/extractTerms'
import { SITE_AI_EXAMPLE_QUESTIONS } from '@/lib/siteAi/siteAiExampleQuestions'
import { getSiteClaimsIndexCached } from '@/lib/siteAi/siteClaimsStore'
import type { MatchedSiteClaim, SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'

function normalize (text: string): string {
  return text.toLowerCase().replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function demoQuestionMatch (question: string, demo: string): boolean {
  const q = normalize(question)
  const d = normalize(demo)
  if (q === d) return true
  if (q.includes(d) || d.includes(q)) return true
  const qTerms = new Set(extractTermsFromText(question))
  const dTerms = extractTermsFromText(demo)
  if (dTerms.length === 0) return false
  const overlap = dTerms.filter((t) => qTerms.has(t)).length
  return overlap >= Math.min(2, dTerms.length)
}

function topicMatchScore (question: string, claim: SiteClaimEntry): number {
  const q = normalize(question)
  let score = 0
  for (const topic of claim.topics) {
    const t = normalize(topic)
    if (t.length < 3) continue
    if (q.includes(t)) score += 2 + Math.min(t.split(/\s+/).length, 3)
  }
  for (const query of claim.searchQueries) {
    const terms = extractTermsFromText(query)
    for (const term of terms) {
      if (q.includes(term)) score += 0.5
    }
  }
  return score
}

export function matchSiteClaims (
  question: string,
  options?: { maxResults?: number; claims?: SiteClaimEntry[] }
): MatchedSiteClaim[] {
  const maxResults = options?.maxResults ?? 3
  const index = options?.claims ?? getSiteClaimsIndexCached()
  const text = question.trim()
  if (text.length < 3 || index.length === 0) return []

  const scored: MatchedSiteClaim[] = []

  for (const claim of index) {
    const matchedVia: MatchedSiteClaim['matchedVia'] = []
    let matchScore = 0

    for (const demo of claim.demoQuestions ?? []) {
      if (demoQuestionMatch(text, demo)) {
        matchedVia.push('demo')
        matchScore += 100
        break
      }
    }

    for (const demo of SITE_AI_EXAMPLE_QUESTIONS) {
      if (claim.demoQuestions?.includes(demo)) continue
      if (demoQuestionMatch(text, demo) && claim.topics.some((t) => normalize(demo).includes(normalize(t)))) {
        matchScore += 5
      }
    }

    const topicScore = topicMatchScore(text, claim)
    if (topicScore > 0) {
      matchedVia.push('topic')
      matchScore += topicScore
    }

    if (matchScore > 0) {
      scored.push({
        ...claim,
        matchScore,
        matchedVia: matchedVia.length ? matchedVia : ['query'],
      })
    }
  }

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, maxResults)
}

export function formatMatchedClaimsForPrompt (claims: MatchedSiteClaim[]): string {
  if (claims.length === 0) return ''
  return JSON.stringify(
    claims.map((c) => ({
      id: c.id,
      title: c.title,
      claim: c.claim,
      answerOpener: c.answerOpener,
      bullets: c.bullets,
      confidence: c.confidence,
      uniqueness: c.uniqueness,
      uniquenessNote: c.uniquenessNote,
      canonicalPaths: c.canonicalPaths,
      searchQueries: c.searchQueries,
      searchPrefixes: c.searchPrefixes,
      doNotSay: c.doNotSay,
      relatedClaimIds: c.relatedClaimIds,
    })),
    null,
    2,
  )
}

export function claimsAgentInstructions (claims: MatchedSiteClaim[]): string {
  if (claims.length === 0) {
    return 'No claim card matched — use search_site and read_article before answering.'
  }
  const primary = claims[0]!
  return [
    `Matched site claim "${primary.title}" (${primary.id}).`,
    'Lead with answerOpener or claim text when present.',
    'You MUST read_article on at least one canonicalPaths entry before elaborating.',
    'Label confidence (project thesis vs documented vs speculative).',
    'Note uniqueness when relevant (site-distinctive vs broader-tradition vs site-position/debunk).',
    'Never use doNotSay phrasing.',
    'Cite article titles in prose — not raw file paths.',
  ].join(' ')
}

/** Paths and search hints from matched claims for index seeding. */
export function claimSeedHints (claims: MatchedSiteClaim[]): {
  paths: string[]
  searchQueries: string[]
  searchPrefixes: string[]
} {
  const paths = new Set<string>()
  const searchQueries = new Set<string>()
  const searchPrefixes = new Set<string>()
  for (const c of claims) {
    for (const p of c.canonicalPaths) paths.add(p)
    for (const q of c.searchQueries) searchQueries.add(q)
    for (const p of c.searchPrefixes ?? []) searchPrefixes.add(p)
  }
  return {
    paths: Array.from(paths),
    searchQueries: Array.from(searchQueries),
    searchPrefixes: Array.from(searchPrefixes),
  }
}
