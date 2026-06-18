/** Read-only WebMCP tools the in-page reply drafter may invoke. */
export const REPLY_INVESTIGATION_TOOL_NAMES = [
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

export type ReplyInvestigationToolName = (typeof REPLY_INVESTIGATION_TOOL_NAMES)[number]

export function isReplyInvestigationToolName (name: string): name is ReplyInvestigationToolName {
  return (REPLY_INVESTIGATION_TOOL_NAMES as readonly string[]).includes(name)
}
