import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { extractTermsFromText, extractedSearchQueries } from '@/lib/replyAssistant/extractTerms'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import { listIndexEntries } from '@/lib/replyAssistant/listIndexEntries'
import { rankEntriesForSourceText } from '@/lib/replyAssistant/rankForText'
import {
  claimSeedHints,
  claimsAgentInstructions,
  formatMatchedClaimsForPrompt,
  matchSiteClaims,
} from '@/lib/siteAi/matchSiteClaims'
import type { SiteAiPageContext } from '@/lib/siteAi/askSiteAi'
import { isPageFocusedQuestion } from '@/lib/siteAi/siteAiPageQuestions'
import type { MatchedSiteClaim } from '@/lib/siteAi/siteClaimsTypes'
import { getWebMcpSearchIndex } from '@/lib/webmcp/indexStore'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'

export type QuestionContextHit = {
  path: string
  title: string
  score: number
  matchedTerms: string[]
  kind: 'page' | 'qa' | 'general' | 'claim'
}

export type PrepareQuestionContextResult = {
  question: string
  extractedQueries: string[]
  qaCandidates: QuestionContextHit[]
  generalCandidates: QuestionContextHit[]
  matchedClaims: MatchedSiteClaim[]
  warnings: string[]
  agentInstructions: string
}

const QA_PATH_RE = /(?:^|\/)qa(?:\/|$|-|_)|common-questions|questions/i

const CONTEXT_PREFIXES = [
  'history/',
  'governance/',
  'events/',
  'cosmos/',
  'science/',
  'influence/',
  'debunk/',
  'timeline/',
] as const

function isQaPath (path: string): boolean {
  return QA_PATH_RE.test(path.replace(/^\//, ''))
}

function rankShortQuestion (
  entries: IndexedPathEntry[],
  question: string,
  maxArticles: number
): { extractedQueries: string[]; results: QuestionContextHit[] } {
  const terms = extractTermsFromText(question)
  const extractedQueries = extractedSearchQueries(terms)
  if (terms.length === 0) {
    return { extractedQueries: [], results: [] }
  }
  const { results } = rankEntriesForSourceText(entries, question, maxArticles)
  return {
    extractedQueries,
    results: results.map((r) => ({
      path: r.path,
      title: r.title,
      score: r.score,
      matchedTerms: r.matchedTerms,
      kind: isQaPath(r.path) ? 'qa' as const : 'general' as const,
    })),
  }
}

function mergeHit (map: Map<string, QuestionContextHit>, hit: QuestionContextHit): void {
  const prev = map.get(hit.path)
  if (!prev || hit.score > prev.score) {
    map.set(hit.path, hit)
  }
}

function claimPathHits (
  index: IndexedPathEntry[],
  paths: string[]
): QuestionContextHit[] {
  const byPath = new Map(index.map((e) => [e.path, e]))
  return paths
    .map((path) => {
      const entry = byPath.get(path)
      if (!entry) {
        return {
          path,
          title: path.split('/').pop()?.replace(/\.md$/, '') ?? path,
          score: 4,
          matchedTerms: ['claim-card'],
          kind: 'claim' as const,
        }
      }
      return {
        path: entry.path,
        title: searchEntryTitle(entry),
        score: 5,
        matchedTerms: ['claim-card'],
        kind: 'claim' as const,
      }
    })
}

export async function prepareQuestionContext (
  question: string,
  pageContext?: SiteAiPageContext | null
): Promise<PrepareQuestionContextResult> {
  const text = question.trim()
  const warnings: string[] = []
  const matchedClaims = matchSiteClaims(text, { maxResults: 3 })

  if (text.length < 3) {
    return {
      question: text,
      extractedQueries: [],
      qaCandidates: [],
      generalCandidates: [],
      matchedClaims: [],
      warnings: ['question too short'],
      agentInstructions: 'Ask the user to clarify their question.',
    }
  }

  const index = await getWebMcpSearchIndex()
  if (!index?.length) {
    return {
      question: text,
      extractedQueries: [],
      qaCandidates: [],
      generalCandidates: [],
      matchedClaims,
      warnings: ['search index unavailable'],
      agentInstructions: matchedClaims.length > 0
        ? claimsAgentInstructions(matchedClaims)
        : 'Index offline — answer from project perspective only; do not invent article citations.',
    }
  }

  const hitMap = new Map<string, QuestionContextHit>()
  const extractedQuerySet = new Set<string>()
  const pageFocused = Boolean(pageContext?.path && isPageFocusedQuestion(text))

  if (pageContext?.path) {
    mergeHit(hitMap, {
      path: pageContext.path,
      title: pageContext.title,
      score: pageFocused ? 12 : 8,
      matchedTerms: ['current-page'],
      kind: 'page',
    })
  }

  const longRank = text.length >= 20
    ? findArticlesForText(index, { sourceText: text, maxArticles: 8 })
    : { extractedQueries: [] as string[], results: [], warnings: [] as string[] }

  for (const q of longRank.extractedQueries) extractedQuerySet.add(q)
  for (const r of longRank.results) mergeHit(hitMap, {
    path: r.path,
    title: r.title,
    score: r.score,
    matchedTerms: r.matchedTerms,
    kind: isQaPath(r.path) ? 'qa' : 'general',
  })

  const shortRank = rankShortQuestion(index, text, 8)
  for (const q of shortRank.extractedQueries) extractedQuerySet.add(q)
  for (const r of shortRank.results) mergeHit(hitMap, r)

  const hints = claimSeedHints(matchedClaims)
  for (const h of claimPathHits(index, hints.paths)) mergeHit(hitMap, h)

  const terms = extractTermsFromText(text)
  const qaQuery = terms.slice(0, 4).join(' ') || text.split(/\s+/).slice(0, 4).join(' ')

  const prefixes = Array.from(new Set<string>([...CONTEXT_PREFIXES, ...hints.searchPrefixes]))
  for (const prefix of prefixes) {
    const list = listIndexEntries(index, {
      prefix,
      query: qaQuery.length >= 2 ? qaQuery : undefined,
      limit: 12,
    })
    for (const entry of list.entries) {
      mergeHit(hitMap, {
        path: entry.path,
        title: entry.title,
        score: isQaPath(entry.path) ? 1.5 : 1,
        matchedTerms: terms.slice(0, 3),
        kind: isQaPath(entry.path) ? 'qa' : 'general',
      })
    }
  }

  for (const query of hints.searchQueries) {
    extractedQuerySet.add(query)
    const list = listIndexEntries(index, { query, limit: 8 })
    for (const entry of list.entries) {
      mergeHit(hitMap, {
        path: entry.path,
        title: entry.title,
        score: 2,
        matchedTerms: extractTermsFromText(query).slice(0, 4),
        kind: isQaPath(entry.path) ? 'qa' : 'general',
      })
    }
  }

  const hits = Array.from(hitMap.values())
  hits.sort((a, b) => {
    const kindOrder = (k: QuestionContextHit['kind']) =>
      k === 'page' ? 0 : k === 'claim' ? 1 : k === 'qa' ? 2 : 3
    const ko = kindOrder(a.kind) - kindOrder(b.kind)
    if (ko !== 0) return ko
    return b.score - a.score
  })

  const qaCandidates = hits.filter((h) => h.kind === 'page' || h.kind === 'qa' || h.kind === 'claim').slice(0, 6)
  const generalCandidates = hits.filter((h) => h.kind === 'general').slice(0, 5)

  if (qaCandidates.length === 0 && generalCandidates.length === 0) {
    warnings.push('no index matches — use search_site before answering')
  }
  warnings.push(...longRank.warnings)

  const pageInstruction = pageContext?.path
    ? `Visitor is reading "${pageContext.title}" (${pageContext.path}). When the question is about this page, read_article that path first.`
    : ''

  let agentInstructions: string
  if (pageFocused && pageContext?.path) {
    agentInstructions = `${pageInstruction} Lead with a concise summary from that article in the site voice.`
  } else if (matchedClaims.length > 0) {
    agentInstructions = [pageInstruction, claimsAgentInstructions(matchedClaims)].filter(Boolean).join(' ')
  } else if (qaCandidates.length > 0) {
    agentInstructions = [pageInstruction, 'Start with read_article on page, Q&A, or claim candidates; fall back to general search if they do not answer the question.'].filter(Boolean).join(' ')
  } else {
    agentInstructions = [pageInstruction, 'No strong Q&A match — use search_site and read_article on general candidates.'].filter(Boolean).join(' ')
  }

  return {
    question: text,
    extractedQueries: Array.from(extractedQuerySet),
    qaCandidates,
    generalCandidates,
    matchedClaims,
    warnings,
    agentInstructions,
  }
}

export function formatQuestionContextForPrompt (ctx: PrepareQuestionContextResult): string {
  const claimsBlock = formatMatchedClaimsForPrompt(ctx.matchedClaims)
  return JSON.stringify({
    question: ctx.question,
    matchedSiteClaims: claimsBlock ? JSON.parse(claimsBlock) : [],
    extractedQueries: ctx.extractedQueries,
    qaCandidates: ctx.qaCandidates,
    generalCandidates: ctx.generalCandidates,
    warnings: ctx.warnings,
    agentInstructions: ctx.agentInstructions,
  }, null, 2)
}
