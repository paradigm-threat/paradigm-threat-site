import type { InputSchema, ToolDescriptor } from '@mcp-b/webmcp-types'
import { getModelContext } from '@/lib/webmcp/modelContext'
import {
  executeComposeShareText,
  executeCopyToClipboard,
  executeDraftReplyToText,
  executeExpandSearchKeywords,
  executeFeelingLucky,
  executeFindArticlesForText,
  executeGetArticleContext,
  executeListSearchFilters,
  executeNavigateToResult,
  executeOpenTimelineEvent,
  executeSearchSite,
  executeSetSearchFilters,
  executeSuggestSearchFromPath,
} from '@/lib/webmcp/toolHandlers'
import { isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'

type AnyTool = ToolDescriptor<Record<string, unknown>, unknown, string>

function wrap (
  name: string,
  description: string,
  inputSchema: InputSchema,
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown,
  readOnly = true
): AnyTool {
  return {
    name,
    description,
    inputSchema,
    annotations: { readOnlyHint: readOnly },
    execute: async (args) => execute(args),
  }
}

const TOOLS: AnyTool[] = [
  wrap('search_site', 'Search paradigm-threat articles and timeline events by keyword (AND semantics).', {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 2, description: 'Space-separated terms; ALL must match' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      includeBlog: { type: 'boolean', default: false },
      includeSectionPages: { type: 'boolean', default: false },
    },
    required: ['query'],
  }, executeSearchSite),

  wrap('suggest_search_from_path', 'Convert a URL path or slug into ranked article matches and a suggested search query.', {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Site path or slug' },
      mode: { type: 'string', enum: ['narrow', 'broad'], default: 'broad' },
    },
    required: ['path'],
  }, executeSuggestSearchFromPath),

  wrap('get_article_context', 'Return TL;DR, keywords, and canonical URL for an article path.', {
    type: 'object',
    properties: {
      path: { type: 'string' },
      includeBodyPreview: { type: 'boolean', default: false },
    },
    required: ['path'],
  }, executeGetArticleContext),

  wrap('compose_share_text', 'Generate platform-specific share or clipboard text for an article.', {
    type: 'object',
    properties: {
      path: { type: 'string' },
      platform: {
        type: 'string',
        enum: ['x', 'bluesky', 'threads', 'linkedin', 'reddit', 'instagram', 'substack', 'truthsocial', 'nextdoor', 'plain'],
      },
      variant: { type: 'string', enum: ['full', 'snippet_only', 'title_url_only', 'alternate_hook'], default: 'full' },
      maxLength: { type: 'integer' },
    },
    required: ['path', 'platform'],
  }, executeComposeShareText),

  wrap('list_search_filters', 'Return current search content filter toggles.', {
    type: 'object',
    properties: {},
  }, () => executeListSearchFilters()),

  wrap('expand_search_keywords', 'Given a query, return co-occurring keywords from matching index entries.', {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 2 },
      limit: { type: 'integer', minimum: 1, maximum: 30, default: 12 },
      includeBlog: { type: 'boolean', default: false },
      includeSectionPages: { type: 'boolean', default: false },
    },
    required: ['query'],
  }, executeExpandSearchKeywords),

  wrap('navigate_to_result', 'Return canonical URL for a path; optionally navigate the browser tab.', {
    type: 'object',
    properties: {
      path: { type: 'string' },
      navigate: { type: 'boolean', default: false },
    },
    required: ['path'],
  }, executeNavigateToResult, false),

  wrap('open_timeline_event', 'Resolve a timeline event id to metadata and deep link.', {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Timeline event id' },
    },
    required: ['id'],
  }, executeOpenTimelineEvent),

  wrap('feeling_lucky', 'Pick a random article or timeline event from the index.', {
    type: 'object',
    properties: {},
  }, () => executeFeelingLucky()),

  wrap('find_articles_for_text', 'Extract terms from pasted forum text and find relevant site articles.', {
    type: 'object',
    properties: {
      sourceText: { type: 'string', minLength: 20 },
      maxArticles: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      includeBlog: { type: 'boolean', default: false },
      includeCitations: { type: 'boolean', default: false },
    },
    required: ['sourceText'],
  }, executeFindArticlesForText),

  wrap(
    'draft_reply_to_text',
    'Draft a forum reply grounded in site articles. Returns template text (Mode B) plus agentContext for Gemini to refine. Citations off by default.',
    {
      type: 'object',
      properties: {
        sourceText: { type: 'string', minLength: 20 },
        maxArticles: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
        includeCitations: { type: 'boolean', default: false },
        citationStyle: { type: 'string', enum: ['inline', 'footer', 'markdown'], default: 'footer' },
        tone: { type: 'string', enum: ['neutral', 'conversational', 'brief'], default: 'conversational' },
        maxLength: { type: 'integer' },
        includeBlog: { type: 'boolean', default: false },
      },
      required: ['sourceText'],
    },
    executeDraftReplyToText
  ),
]

const ACTUATION_TOOLS: AnyTool[] = [
  wrap('set_search_filters', 'Apply search content filters; optionally navigate to a search query.', {
    type: 'object',
    properties: {
      includeBlog: { type: 'boolean' },
      includeSectionPages: { type: 'boolean' },
      query: { type: 'string' },
    },
  }, executeSetSearchFilters, false),

  wrap('copy_to_clipboard', 'Write text to clipboard (requires actuation flag and user context).', {
    type: 'object',
    properties: {
      text: { type: 'string' },
    },
    required: ['text'],
  }, executeCopyToClipboard, false),
]

let registered = false

export function registerAllWebMcpTools (): void {
  if (registered) return
  const ctx = getModelContext()
  if (!ctx) return

  for (const tool of TOOLS) {
    ctx.registerTool(tool as ToolDescriptor & { inputSchema: InputSchema })
  }
  if (isWebMcpActuationEnabled()) {
    for (const tool of ACTUATION_TOOLS) {
      ctx.registerTool(tool as ToolDescriptor & { inputSchema: InputSchema })
    }
  }
  registered = true
}

export function resetWebMcpRegistrationForTests (): void {
  registered = false
}

export const WEBMCP_TOOL_NAMES = [
  ...TOOLS.map((t) => t.name),
  ...(isWebMcpActuationEnabled() ? ACTUATION_TOOLS.map((t) => t.name) : []),
]
