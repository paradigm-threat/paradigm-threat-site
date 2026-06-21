import { setFetchProgressListener } from '@/lib/webmcp/fetchProgress'

export type SiteAiAgentProgress =
  | { phase: 'init'; message: string }
  | { phase: 'loading-model'; message: string; loaded?: number }
  | { phase: 'context'; message: string }
  | { phase: 'thinking'; turn: number; message: string }
  | {
      phase: 'tool'
      toolName: string
      status: 'start' | 'done'
      args: Record<string, unknown>
      detail: string
    }
  | {
      phase: 'fetch'
      path: string
      status: 'start' | 'done'
      detail: string
    }
  | { phase: 'writing'; message: string }

/** @deprecated Use SiteAiAgentProgress */
export type DraftReplyProgress = SiteAiAgentProgress

export type AgentProgressStep = {
  id: string
  label: string
  status: 'active' | 'done'
}

let stepCounter = 0

export function nextProgressStepId (): string {
  stepCounter += 1
  return `step-${stepCounter}-${Date.now()}`
}

export function formatToolProgressDetail (
  toolName: string,
  args: Record<string, unknown>
): string {
  const path = typeof args.path === 'string' ? args.path : undefined
  const query = typeof args.query === 'string' ? args.query : undefined
  const prefix = typeof args.prefix === 'string' ? args.prefix : undefined

  switch (toolName) {
    case 'read_article':
      return path ? `Reading article: ${path}` : 'Fetching article content…'
    case 'search_site':
      return query ? `Searching site for “${truncate(query, 48)}”` : 'Searching site index…'
    case 'list_index_entries':
      if (prefix && query) return `Browsing ${prefix} matching “${truncate(query, 36)}”`
      if (prefix) return `Browsing index under ${prefix}`
      return query ? `Browsing index for “${truncate(query, 36)}”` : 'Browsing site index…'
    case 'prepare_reply_context':
      return 'Finding articles related to the pasted post…'
    case 'find_articles_for_text':
      return 'Ranking articles that match your text…'
    case 'get_article_context':
      return path ? `Loading summary for ${path}` : 'Loading article summary…'
    case 'expand_search_keywords':
      return query ? `Finding related keywords for “${truncate(query, 36)}”` : 'Expanding search keywords…'
    case 'get_project_perspective':
      return 'Loading Paradigm Threat voice & perspective…'
    case 'suggest_search_from_path':
      return path ? `Suggesting search terms for ${path}` : 'Suggesting search terms…'
    case 'format_reply_citations':
      return 'Formatting citation links…'
    case 'open_timeline_event':
      return typeof args.id === 'string' ? `Looking up timeline event ${args.id}` : 'Looking up timeline event…'
    default:
      return `Running ${toolName.replace(/_/g, ' ')}…`
  }
}

function truncate (text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function shortenFetchPath (path: string): string {
  const normalized = path.replace(/^\//, '').trim()
  if (normalized.length <= 56) return normalized
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length >= 2) return `…/${parts.slice(-2).join('/')}`
  return `…${normalized.slice(-54)}`
}

export function formatFetchProgressDetail (path: string, status: 'start' | 'done'): string {
  const short = shortenFetchPath(path)
  return status === 'start' ? `Fetching ${short}…` : `Fetched ${short}`
}

function isFetchStepLabel (label: string): boolean {
  return label.startsWith('Fetching ') || label.startsWith('Fetched ')
}

export function progressEventLabel (event: SiteAiAgentProgress): string {
  switch (event.phase) {
    case 'init':
      return event.message
    case 'loading-model':
      return event.loaded != null && event.loaded < 1
        ? `${event.message} (${Math.round(event.loaded * 100)}%)`
        : event.message
    case 'context':
      return event.message
    case 'thinking':
      return event.message
    case 'tool':
      return event.status === 'start' ? event.detail : `Done: ${event.detail}`
    case 'fetch':
      return event.detail
    case 'writing':
      return event.message
    default:
      return 'Working…'
  }
}

export function applyProgressEvent (
  steps: AgentProgressStep[],
  event: SiteAiAgentProgress
): { steps: AgentProgressStep[]; current: string } {
  const current = progressEventLabel(event)

  if (event.phase === 'thinking' || event.phase === 'writing' || event.phase === 'loading-model') {
    return { steps, current }
  }

  if (event.phase === 'fetch') {
    const activeFetchIdx = steps.findIndex((s) => s.status === 'active' && isFetchStepLabel(s.label))
    if (event.status === 'start') {
      if (activeFetchIdx >= 0) {
        const updated = [...steps]
        updated[activeFetchIdx] = { ...updated[activeFetchIdx]!, label: event.detail }
        return { steps: updated, current: event.detail }
      }
      const donePrevious = steps.map((s) =>
        s.status === 'active' ? { ...s, status: 'done' as const } : s
      )
      return {
        steps: [...donePrevious, {
          id: nextProgressStepId(),
          label: event.detail,
          status: 'active' as const,
        }].slice(-12),
        current: event.detail,
      }
    }
    if (activeFetchIdx >= 0) {
      const updated = [...steps]
      updated[activeFetchIdx] = {
        ...updated[activeFetchIdx]!,
        label: event.detail,
        status: 'done' as const,
      }
      return { steps: updated, current: event.detail }
    }
    return {
      steps: [...steps, {
        id: nextProgressStepId(),
        label: event.detail,
        status: 'done' as const,
      }].slice(-12),
      current: event.detail,
    }
  }

  if (event.phase === 'tool' && event.status === 'done') {
    const updated = steps.map((s) =>
      s.label === event.detail && s.status === 'active'
        ? { ...s, status: 'done' as const }
        : s
    )
    return { steps: updated, current: event.detail }
  }

  const donePrevious = steps.map((s) =>
    s.status === 'active' ? { ...s, status: 'done' as const } : s
  )

  const label = event.phase === 'tool' && event.status === 'start'
    ? event.detail
    : current

  const next: AgentProgressStep = {
    id: nextProgressStepId(),
    label,
    status: 'active',
  }

  return { steps: [...donePrevious, next].slice(-12), current }
}

export const SLOW_MODEL_HINT = 'On-device AI can take 30–60 seconds per step on first run — still working…'
export const SLOW_MODEL_HINT_EXTENDED = 'Model is still processing. You can cancel and try a shorter question if this persists.'

export const AGENT_STALL_ERROR_MESSAGE =
  'On-device AI stopped making progress. Open chrome://on-device-internals to check the model download, refresh, and try again — or cancel and use a shorter post.'

export const LM_CREATE_TIMEOUT_MESSAGE =
  'On-device model did not start within 2 minutes. Check chrome://on-device-internals, then refresh and try again.'

export function bindFetchProgressToAgent (
  onProgress?: (event: SiteAiAgentProgress) => void
): () => void {
  if (!onProgress) {
    setFetchProgressListener(null)
    return () => {}
  }
  setFetchProgressListener((path, status) => {
    onProgress({
      phase: 'fetch',
      path,
      status,
      detail: formatFetchProgressDetail(path, status),
    })
  })
  return () => setFetchProgressListener(null)
}

export async function withFetchProgressReporting<T> (
  onProgress: ((event: SiteAiAgentProgress) => void) | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const unbind = bindFetchProgressToAgent(onProgress)
  try {
    return await fn()
  } finally {
    unbind()
  }
}
