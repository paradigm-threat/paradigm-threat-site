import type { InputSchema, ToolDescriptor } from '@mcp-b/webmcp-types'
import { getModelContext } from '@/lib/webmcp/modelContext'
import {
  executeComposeShareText,
  executeCopyToClipboard,
  executeExpandSearchKeywords,
  executeFeelingLucky,
  executeFindArticlesForText,
  executeFormatReplyCitations,
  executeGetArticleContext,
  executeGetProjectPerspective,
  executeGetSiteClaims,
  executeListIndexEntries,
  executeListSearchFilters,
  executeNavigateToResult,
  executeOpenTimelineEvent,
  executePrepareReplyContext,
  executeReadArticle,
  executeSearchSite,
  executeSetSearchFilters,
  executeSuggestSearchFromPath,
  executePrepareIllustrationPrompt,
  executeSubmitInvestigationIdea,
  executeSubmitChatComment,
} from '@/lib/webmcp/toolHandlers'
import { isInvestigationSubmitEnabled, isWebMcpActuationEnabled } from '@/lib/siteOpsFeature'

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
  wrap('search_site', 'Search paradigm-threat articles and timeline events by keyword (AND filter, title-aware rank).', {
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

  wrap('prepare_illustration_prompt', 'Build illustration prompt + local generate-illustration.py CLI command (read-only; does not call HF or write files).', {
    type: 'object',
    properties: {
      articlePath: { type: 'string', description: 'Repo-relative markdown path e.g. science/cern_portal/foo.md' },
      path: { type: 'string', description: 'Alias for articlePath' },
      slot: { type: 'string', enum: ['hero', 'section'], default: 'hero' },
      timeline: { type: 'boolean', description: 'Use timeline 16:9 prompt style' },
      markdown: { type: 'string', description: 'Optional inline markdown if article cannot be fetched' },
    },
  }, executePrepareIllustrationPrompt),

  wrap('get_article_context', 'Return TL;DR, keywords, and canonical URL for an article path.', {
    type: 'object',
    properties: {
      path: { type: 'string' },
      includeBodyPreview: { type: 'boolean', default: false },
    },
    required: ['path'],
  }, executeGetArticleContext),

  wrap('get_project_perspective', 'Return Paradigm Threat worldview seed: history, science (æther), and reply voice. Use before drafting forum replies.', {
    type: 'object',
    properties: {},
  }, () => executeGetProjectPerspective()),

  wrap('get_site_claims', 'Return curated site claim/conclusion cards (summaries with canonical article paths). Pass query to match a question or id for one entry.', {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Visitor question or topic keywords' },
      id: { type: 'string', description: 'Claim id, e.g. giants-fate' },
    },
  }, (args) => executeGetSiteClaims(args)),

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

  wrap('find_articles_for_text', 'Index-only: extract terms from pasted text and rank matching articles (no markdown fetch).', {
    type: 'object',
    properties: {
      sourceText: { type: 'string', minLength: 20 },
      maxArticles: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      includeBlog: { type: 'boolean', default: false },
      includeCitations: { type: 'boolean', default: false },
    },
    required: ['sourceText'],
  }, executeFindArticlesForText),

  wrap('prepare_reply_context', 'Parse pasted forum text and return index seed hits plus agent workflow instructions. Does not fetch markdown — agent should use read_article.', {
    type: 'object',
    properties: {
      sourceText: { type: 'string', minLength: 20 },
      maxSeedArticles: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      includeCitations: { type: 'boolean', default: false },
      citationStyle: { type: 'string', enum: ['inline', 'footer', 'markdown'], default: 'footer' },
      tone: { type: 'string', enum: ['neutral', 'conversational', 'brief'], default: 'conversational' },
      userInstructions: { type: 'string', description: 'Optional angle, tone, or emphasis for the reply draft' },
      includeBlog: { type: 'boolean', default: false },
    },
    required: ['sourceText'],
  }, executePrepareReplyContext),

  wrap('list_index_entries', 'Browse the search index by prefix, kind, or query. Use before read_article to discover paths.', {
    type: 'object',
    properties: {
      prefix: { type: 'string', description: 'Path prefix, e.g. debunk/ or timeline/' },
      kind: { type: 'string', enum: ['article', 'timeline', 'other', 'all'], default: 'all' },
      query: { type: 'string', description: 'Optional AND keyword filter on index searchText' },
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      includeBlog: { type: 'boolean', default: false },
      includeSectionPages: { type: 'boolean', default: false },
    },
  }, executeListIndexEntries),

  wrap('read_article', 'Fetch article or timeline markdown. Returns TL;DR, keywords, and plain body (paginate with offset/maxChars).', {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Index path, e.g. debunk/foo.md or timeline/evt-123' },
      offset: { type: 'integer', minimum: 0, default: 0 },
      maxChars: { type: 'integer', minimum: 500, maximum: 50000, default: 12000 },
      includeRawMarkdown: { type: 'boolean', default: false },
    },
    required: ['path'],
  }, executeReadArticle),

  wrap('format_reply_citations', 'Format a citation footer or inline block from title/url pairs.', {
    type: 'object',
    properties: {
      articles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['title', 'url'],
        },
      },
      citationStyle: { type: 'string', enum: ['inline', 'footer', 'markdown'], default: 'footer' },
    },
    required: ['articles'],
  }, (args) => executeFormatReplyCitations(args)),
]

const SUBMISSION_TOOLS: AnyTool[] = [
  wrap('submit_investigation_idea', 'Submit a visitor-proposed topic for site investigation (text + http(s) URLs only; no images). Requires explicit user confirmation in chat before calling.', {
    type: 'object',
    properties: {
      topic: { type: 'string', minLength: 3, maxLength: 200 },
      description: { type: 'string', minLength: 20, maxLength: 5000 },
      urls: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 10,
        description: 'Optional http(s) reference links',
      },
      email: { type: 'string', description: 'Optional contact email; omit when anonymous' },
      is_anonymous: { type: 'boolean', default: true },
      search_query: { type: 'string', description: 'Optional search query context' },
      source: { type: 'string', enum: ['site_ai', 'webmcp'], default: 'webmcp' },
    },
    required: ['topic', 'description'],
  }, executeSubmitInvestigationIdea, false),

  wrap('submit_chat_comment', 'Post a comment to a Paradigm Threat chat channel via Relay (chat/public branch). Requires explicit user confirmation before calling.', {
    type: 'object',
    properties: {
      channel: { type: 'string', minLength: 1, maxLength: 200 },
      content: { type: 'string', minLength: 1, maxLength: 1024 },
      author: { type: 'string', minLength: 1, maxLength: 18 },
      username: { type: 'string', minLength: 1, maxLength: 18 },
      is_anonymous: { type: 'boolean', default: true },
      anonymous: { type: 'boolean' },
    },
    required: ['channel', 'content'],
  }, executeSubmitChatComment, false),
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
  if (isInvestigationSubmitEnabled()) {
    for (const tool of SUBMISSION_TOOLS) {
      ctx.registerTool(tool as ToolDescriptor & { inputSchema: InputSchema })
    }
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
  ...(isInvestigationSubmitEnabled() ? SUBMISSION_TOOLS.map((t) => t.name) : []),
  ...(isWebMcpActuationEnabled() ? ACTUATION_TOOLS.map((t) => t.name) : []),
]
