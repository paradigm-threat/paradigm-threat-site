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
