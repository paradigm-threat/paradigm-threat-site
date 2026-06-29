import { isInvestigationSubmitEnabled, isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'

/** Read-only WebMCP tools the on-device site AI may invoke. */
export const SITE_AI_INVESTIGATION_TOOL_NAMES = [
  'search_site',
  'suggest_search_from_path',
  'get_article_context',
  'get_project_perspective',
  'get_site_claims',
  'expand_search_keywords',
  'find_articles_for_text',
  'prepare_reply_context',
  'list_index_entries',
  'read_article',
  'format_reply_citations',
  'open_timeline_event',
] as const

export const SITE_AI_SUBMISSION_TOOL_NAMES = [
  'submit_investigation_idea',
] as const

export const SITE_AI_ACTUATION_TOOL_NAMES = [
  'navigate_to_result',
] as const

export type SiteAiInvestigationToolName = (typeof SITE_AI_INVESTIGATION_TOOL_NAMES)[number]
export type SiteAiActuationToolName = (typeof SITE_AI_ACTUATION_TOOL_NAMES)[number]

export function getSiteAiToolNames (): string[] {
  const names: string[] = [...SITE_AI_INVESTIGATION_TOOL_NAMES]
  if (isInvestigationSubmitEnabled()) {
    names.push(...SITE_AI_SUBMISSION_TOOL_NAMES)
  }
  if (isWebMcpActuationEnabled()) {
    names.push(...SITE_AI_ACTUATION_TOOL_NAMES)
  }
  return names
}

export function isSiteAiInvestigationToolName (name: string): boolean {
  return getSiteAiToolNames().includes(name)
}
