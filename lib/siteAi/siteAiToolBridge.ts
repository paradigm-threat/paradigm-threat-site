import type { CallToolResult } from '@mcp-b/webmcp-types'
import {
  executeExpandSearchKeywords,
  executeFindArticlesForText,
  executeFormatReplyCitations,
  executeGetArticleContext,
  executeGetProjectPerspective,
  executeGetSiteClaims,
  executeListIndexEntries,
  executeNavigateToResult,
  executeOpenTimelineEvent,
  executePrepareReplyContext,
  executeReadArticle,
  executeSearchSite,
  executeSuggestSearchFromPath,
  executeSubmitInvestigationIdea,
} from '@/lib/webmcp/toolHandlers'
import {
  isSiteAiInvestigationToolName,
} from '@/lib/siteAi/investigationTools'
import { isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'

export type SiteAiToolCall = {
  name: string
  arguments: Record<string, unknown>
}

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult> | CallToolResult

const BASE_HANDLERS: Record<string, ToolHandler> = {
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
  submit_investigation_idea: executeSubmitInvestigationIdea,
}

function getHandlers (): Record<string, ToolHandler> {
  if (isWebMcpActuationEnabled()) {
    return { ...BASE_HANDLERS, navigate_to_result: executeNavigateToResult }
  }
  return BASE_HANDLERS
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
  const handler = getHandlers()[name]
  if (!handler) {
    return `Error: tool "${name}" is not available`
  }
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
