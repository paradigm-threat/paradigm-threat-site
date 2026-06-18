import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { extractTermsFromText, extractedSearchQueries } from '@/lib/replyAssistant/extractTerms'
import { findArticlesForText } from '@/lib/replyAssistant/findArticlesForText'
import { listIndexEntries } from '@/lib/replyAssistant/listIndexEntries'
import { rankEntriesForSourceText } from '@/lib/replyAssistant/rankForText'
import { getWebMcpSearchIndex } from '@/lib/webmcp/indexStore'

export type QuestionContextHit = {
  path: string
  title: string
  score: number
  matchedTerms: string[]
  kind: 'qa' | 'general'
}

export type PrepareQuestionContextResult = {
  question: string
  extractedQueries: string[]
  qaCandidates: QuestionContextHit[]
  generalCandidates: QuestionContextHit[]
  warnings: string[]
  agentInstructions: string
}

const QA_PATH_RE = /(?:^|\/)qa(?:\/|$|-|_)|common-questions|questions/i

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

export async function prepareQuestionContext (
  question: string
): Promise<PrepareQuestionContextResult> {
  const text = question.trim()
  const warnings: string[] = []

  if (text.length < 3) {
    return {
      question: text,
      extractedQueries: [],
      qaCandidates: [],
      generalCandidates: [],
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
      warnings: ['search index unavailable'],
      agentInstructions: 'Index offline — answer from project perspective only; do not invent article citations.',
    }
  }

  const ranked = text.length >= 20
    ? findArticlesForText(index, { sourceText: text, maxArticles: 8 })
    : { extractedQueries: [], results: [], warnings: [] as string[] }

  let hits: QuestionContextHit[] = ranked.results.map((r) => ({
    path: r.path,
    title: r.title,
    score: r.score,
    matchedTerms: r.matchedTerms,
    kind: isQaPath(r.path) ? 'qa' : 'general',
  }))

  if (hits.length === 0) {
    const short = rankShortQuestion(index, text, 8)
    hits = short.results
    ranked.extractedQueries = short.extractedQueries
  }

  const terms = extractTermsFromText(text)
  const qaQuery = terms.slice(0, 4).join(' ') || text.split(/\s+/).slice(0, 4).join(' ')
  const qaList = listIndexEntries(index, {
    prefix: 'history/',
    query: qaQuery.length >= 2 ? qaQuery : undefined,
    limit: 15,
  })

  for (const entry of qaList.entries) {
    if (!isQaPath(entry.path)) continue
    if (hits.some((h) => h.path === entry.path)) continue
    hits.push({
      path: entry.path,
      title: entry.title,
      score: 1.2,
      matchedTerms: terms.slice(0, 3),
      kind: 'qa',
    })
  }

  hits.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'qa' ? -1 : 1
    return b.score - a.score
  })

  const qaCandidates = hits.filter((h) => h.kind === 'qa').slice(0, 5)
  const generalCandidates = hits.filter((h) => h.kind === 'general').slice(0, 5)

  if (qaCandidates.length === 0 && generalCandidates.length === 0) {
    warnings.push('no index matches — use search_site before answering')
  } else if (qaCandidates.length > 0) {
    warnings.push('prefer reading Q&A candidates before general articles')
  }

  warnings.push(...ranked.warnings)

  const agentInstructions = qaCandidates.length > 0
    ? 'Start with read_article on Q&A candidates; fall back to general search if they do not answer the question.'
    : 'No strong Q&A match — use search_site and read_article on general candidates.'

  return {
    question: text,
    extractedQueries: ranked.extractedQueries,
    qaCandidates,
    generalCandidates,
    warnings,
    agentInstructions,
  }
}

export function formatQuestionContextForPrompt (ctx: PrepareQuestionContextResult): string {
  return JSON.stringify({
    question: ctx.question,
    extractedQueries: ctx.extractedQueries,
    qaCandidates: ctx.qaCandidates,
    generalCandidates: ctx.generalCandidates,
    warnings: ctx.warnings,
    agentInstructions: ctx.agentInstructions,
  }, null, 2)
}
