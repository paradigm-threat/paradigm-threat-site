import type { SearchContentFilters } from '@/lib/searchIndexFilter'

export type SiteAiSearchIntent =
  | 'explain-results'
  | 'nl-search'
  | 'deep-dive'
  | 'follow-up'
  | 'ask'

export type SiteAiSearchContext = {
  query: string
  resultPaths: string[]
  filters: SearchContentFilters
}

export type SearchChatIntentInput = {
  intent: SiteAiSearchIntent
  question?: string
  searchContext?: SiteAiSearchContext | null
}

export type SearchChatIntentResult = {
  userMessage: string
  systemPromptOverlay: string
  maxTurns?: number
}

function formatPathsBlock (paths: string[]): string {
  if (paths.length === 0) return '(no paths listed)'
  return JSON.stringify(paths.slice(0, 12), null, 2)
}

export function buildSearchChatIntent (input: SearchChatIntentInput): SearchChatIntentResult {
  const ctx = input.searchContext
  const query = ctx?.query?.trim() || input.question?.trim() || ''
  const paths = ctx?.resultPaths ?? []

  switch (input.intent) {
    case 'explain-results':
      return {
        userMessage: [
          `Explain how these search results answer my query: "${query}"`,
          '',
          'Top result paths from the search page:',
          formatPathsBlock(paths),
          '',
          'Summarize what each relevant article argues and how they connect. Cite article titles in prose.',
        ].join('\n'),
        systemPromptOverlay: [
          '## Search session: explain results',
          'The visitor ran a keyword search and wants a narrative explanation of the hit list.',
          'Use read_article on the listed paths (and search_site if gaps remain).',
          'Do not dump raw file paths in the final answer unless asked.',
        ].join('\n'),
        maxTurns: 8,
      }

    case 'nl-search':
      return {
        userMessage: input.question?.trim() || query,
        systemPromptOverlay: [
          '## Search session: natural language',
          'The visitor asked in natural language instead of keywords.',
          'Translate intent into search_site / list_index_entries queries, then read_article before answering.',
          'If helpful, suggest a tighter keyword query they can use on the search page.',
        ].join('\n'),
        maxTurns: 10,
      }

    case 'deep-dive':
      return {
        userMessage: [
          `Investigation deep-dive on: "${query}"`,
          '',
          'Prioritize paths under /investigations/, matched site claims, and related timeline events.',
          'Seed paths from search:',
          formatPathsBlock(paths),
        ].join('\n'),
        systemPromptOverlay: [
          '## Search session: investigation deep-dive',
          'Workflow: get_site_claims → list_index_entries under events/ and investigations/ → read_article (2+ sources) → open_timeline_event when relevant.',
          'Label confidence (project thesis vs documented vs speculative).',
          'End with 2–3 concrete article recommendations.',
        ].join('\n'),
        maxTurns: 12,
      }

    case 'follow-up':
      return {
        userMessage: input.question?.trim() || `Follow up on my search for "${query}"`,
        systemPromptOverlay: [
          '## Search session: follow-up',
          'Continue the investigation thread. Use site tools as needed.',
        ].join('\n'),
        maxTurns: 8,
      }

    case 'ask':
    default:
      return {
        userMessage: input.question?.trim() || `Tell me more about my search for "${query}"`,
        systemPromptOverlay: [
          '## Search session',
          'The visitor is on the search page. Ground answers in index search and read_article.',
        ].join('\n'),
        maxTurns: 8,
      }
  }
}

export function formatSearchContextForPrompt (ctx: SiteAiSearchContext | null | undefined): string {
  if (!ctx) return ''
  return [
    'Search session context:',
    JSON.stringify({
      query: ctx.query,
      resultPaths: ctx.resultPaths.slice(0, 12),
      filters: ctx.filters,
    }, null, 2),
  ].join('\n')
}

export const SEARCH_NL_MODE_STORAGE_KEY = 'pt-search-nl-mode'

export function readSearchNlMode (): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(SEARCH_NL_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeSearchNlMode (enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SEARCH_NL_MODE_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}
