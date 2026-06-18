import type { CallToolResult } from '@mcp-b/webmcp-types'
import {
  executeExpandSearchKeywords,
  executeFindArticlesForText,
  executeFormatReplyCitations,
  executeGetArticleContext,
  executeGetProjectPerspective,
  executeGetSiteClaims,
  executeListIndexEntries,
  executeOpenTimelineEvent,
  executePrepareReplyContext,
  executeReadArticle,
  executeSearchSite,
  executeSuggestSearchFromPath,
} from '@/lib/webmcp/toolHandlers'
import {
  isSiteAiInvestigationToolName,
  type SiteAiInvestigationToolName,
} from '@/lib/siteAi/investigationTools'

export type SiteAiToolCall = {
  name: SiteAiInvestigationToolName
  arguments: Record<string, unknown>
}

const HANDLERS: Record<
  SiteAiInvestigationToolName,
  (args: Record<string, unknown>) => Promise<CallToolResult> | CallToolResult
> = {
  search_site: executeSearchSite,
  suggest_search_from_path: executeSuggestSearchFromPath,
  get_article_context: executeGetArticleContext,
  get_project_perspective: () => executeGetProjectPerspective(),
  get_site_claims: executeGetSiteClaims,
  expand_search_keywords: executeExpandSearchKeywords,
  find_articles_for_text: executeFindArticlesForText,
  prepare_reply_context: executePrepareReplyContext,
  list_index_entries: executeListIndexEntries,
  read_article: executeReadArticle,
  format_reply_citations: executeFormatReplyCitations,
  open_timeline_event: executeOpenTimelineEvent,
}

export function toolResultToText (result: CallToolResult): string {
  if (result.isError) {
    const block = result.content?.find((c) => c.type === 'text')
    const text = block && 'text' in block && typeof block.text === 'string' ? block.text : 'Tool error'
    return `Error: ${text}`
  }
  const block = result.content?.find((c) => c.type === 'text')
  if (block && 'text' in block && typeof block.text === 'string' && block.text) {
    return block.text
  }
  return JSON.stringify(result.structuredContent ?? result.content, null, 2)
}

export async function executeSiteAiTool (
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (!isSiteAiInvestigationToolName(name)) {
    return `Error: tool "${name}" is not allowed`
  }
  const handler = HANDLERS[name]
  const result = await handler(args ?? {})
  return toolResultToText(result)
}

export const TOOL_CALL_START = '<<<TOOL_CALL>>>'
export const TOOL_CALL_END = '<<<END_TOOL_CALL>>>'

export function parseToolCall (text: string): SiteAiToolCall | null {
  const trimmed = text.trim()
  const startIdx = trimmed.indexOf(TOOL_CALL_START)
  const endIdx = trimmed.indexOf(TOOL_CALL_END)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonSlice = trimmed.slice(startIdx + TOOL_CALL_START.length, endIdx).trim()
    return parseToolCallJson(jsonSlice)
  }

  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (fenced?.[1]) {
    const parsed = parseToolCallJson(fenced[1])
    if (parsed) return parsed
  }

  if (trimmed.startsWith('{') && trimmed.includes('"name"')) {
    return parseToolCallJson(trimmed)
  }

  return null
}

function parseToolCallJson (jsonText: string): SiteAiToolCall | null {
  try {
    const raw = JSON.parse(jsonText) as Record<string, unknown>
    const name = String(raw.name ?? raw.tool ?? '').trim()
    if (!isSiteAiInvestigationToolName(name)) return null
    const args = raw.arguments ?? raw.args
    if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
      return null
    }
    return { name, arguments: (args as Record<string, unknown>) ?? {} }
  } catch {
    return null
  }
}

export function stripToolMarkers (text: string): string {
  return text
    .replace(new RegExp(`${TOOL_CALL_START}[\\s\\S]*?${TOOL_CALL_END}`, 'g'), '')
    .trim()
}
