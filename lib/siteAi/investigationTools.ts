/** Read-only WebMCP tools the on-device site AI may invoke. */
export const SITE_AI_INVESTIGATION_TOOL_NAMES = [
  'search_site',
  'suggest_search_from_path',
  'get_article_context',
  'get_project_perspective',
  'expand_search_keywords',
  'find_articles_for_text',
  'prepare_reply_context',
  'list_index_entries',
  'read_article',
  'format_reply_citations',
  'open_timeline_event',
] as const

export type SiteAiInvestigationToolName = (typeof SITE_AI_INVESTIGATION_TOOL_NAMES)[number]

export function isSiteAiInvestigationToolName (name: string): name is SiteAiInvestigationToolName {
  return (SITE_AI_INVESTIGATION_TOOL_NAMES as readonly string[]).includes(name)
}
