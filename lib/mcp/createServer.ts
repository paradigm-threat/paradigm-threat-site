import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
  mcpComputeYearsAgo,
  mcpGetArticleContext,
  mcpGetChronologyFramework,
  mcpGetEventDates,
  mcpGetProjectPerspective,
  mcpGetSiteClaims,
  mcpReadArticle,
  mcpResearchStatus,
  mcpSearchSite,
  mcpSubmitInvestigationIdea,
  mcpSubmitChatComment,
} from '@/lib/mcp/serverHandlers'

export type McpServerContext = {
  submitClientKey?: string
}

function jsonResult (data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

type ToolConfig = {
  description: string
  inputSchema?: z.ZodRawShape
  annotations?: ToolAnnotations
}

/** Avoids MCP SDK + Zod generic depth limits under tsconfig target es5. */
function registerJsonTool (
  server: McpServer,
  name: string,
  config: ToolConfig,
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown,
) {
  const register = server.registerTool.bind(server) as (
    toolName: string,
    toolConfig: ToolConfig,
    cb: (args: Record<string, unknown>) => ReturnType<typeof jsonResult> | Promise<ReturnType<typeof jsonResult>>,
  ) => void

  register(name, config, async (args) => jsonResult(await handler(args)))
}

const searchSchema = {
  query: z.string().min(2).describe('Space-separated terms; ALL must match'),
  limit: z.number().int().min(1).max(50).optional(),
  includeBlog: z.boolean().optional(),
  includeSectionPages: z.boolean().optional(),
}

const readOnly = { readOnlyHint: true as const }

function registerSearchTools (server: McpServer) {
  const runSearch = (args: Record<string, unknown>) => mcpSearchSite({
    query: String(args.query ?? ''),
    limit: typeof args.limit === 'number' ? args.limit : undefined,
    includeBlog: typeof args.includeBlog === 'boolean' ? args.includeBlog : undefined,
    includeSectionPages: typeof args.includeSectionPages === 'boolean' ? args.includeSectionPages : undefined,
  })

  registerJsonTool(server, 'search_site', {
    description: 'Search paradigm-threat articles and timeline events by keyword (AND filter, title-aware rank).',
    inputSchema: searchSchema,
    annotations: readOnly,
  }, runSearch)

  registerJsonTool(server, 'search', {
    description: 'ChatGPT deep-research alias for search_site.',
    inputSchema: searchSchema,
    annotations: readOnly,
  }, runSearch)
}

export function createParadigmThreatMcpServer (context: McpServerContext = {}): McpServer {
  const server = new McpServer({
    name: 'paradigm-threat-research',
    version: '0.1.0',
  })

  const submitClientKey = context.submitClientKey ?? 'mcp'

  registerSearchTools(server)

  registerJsonTool(server, 'fetch', {
    description: 'ChatGPT deep-research alias: article metadata + optional body preview by repo path.',
    inputSchema: {
      path: z.string().describe('Repo-relative path e.g. history/mudflood/page.md'),
      includeBodyPreview: z.boolean().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpGetArticleContext({
    path: String(args.path ?? ''),
    includeBodyPreview: typeof args.includeBodyPreview === 'boolean' ? args.includeBodyPreview : undefined,
  }))

  registerJsonTool(server, 'get_site_claims', {
    description: 'Match a question to curated site thesis cards (site-claims.json).',
    inputSchema: {
      query: z.string().optional(),
      id: z.string().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpGetSiteClaims({
    query: typeof args.query === 'string' ? args.query : undefined,
    id: typeof args.id === 'string' ? args.id : undefined,
  }))

  registerJsonTool(server, 'get_project_perspective', {
    description: 'Paradigm Threat worldview seed (voice, not evidence).',
    inputSchema: {},
    annotations: readOnly,
  }, () => mcpGetProjectPerspective())

  registerJsonTool(server, 'get_article_context', {
    description: 'TL;DR, keywords, canonical URL for an article path.',
    inputSchema: {
      path: z.string(),
      includeBodyPreview: z.boolean().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpGetArticleContext({
    path: String(args.path ?? ''),
    includeBodyPreview: typeof args.includeBodyPreview === 'boolean' ? args.includeBodyPreview : undefined,
  }))

  registerJsonTool(server, 'read_article', {
    description: 'Paginated markdown body for an article or timeline path.',
    inputSchema: {
      path: z.string(),
      offset: z.number().int().min(0).optional(),
      limit: z.number().int().min(500).max(40000).optional(),
    },
    annotations: readOnly,
  }, (args) => mcpReadArticle({
    path: String(args.path ?? ''),
    offset: typeof args.offset === 'number' ? args.offset : undefined,
    limit: typeof args.limit === 'number' ? args.limit : undefined,
  }))

  registerJsonTool(server, 'research_status', {
    description: 'Coverage check: search + site claims + gaps before deep read. Returns ResearchEnvelope with honest not_in_corpus when applicable.',
    inputSchema: {
      question: z.string().min(3),
      includeBlog: z.boolean().optional(),
      expandKeywords: z.boolean().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpResearchStatus({
    question: String(args.question ?? ''),
    includeBlog: typeof args.includeBlog === 'boolean' ? args.includeBlog : undefined,
    expandKeywords: typeof args.expandKeywords === 'boolean' ? args.expandKeywords : undefined,
  }))

  registerJsonTool(server, 'get_chronology_framework', {
    description: 'NC / Blip / Scaligerian glossary and elapsed-time rules (static).',
    inputSchema: {},
    annotations: readOnly,
  }, () => mcpGetChronologyFramework())

  registerJsonTool(server, 'compute_years_ago', {
    description: 'Elapsed calendar years and blip-adjusted span from signed year or eventId to now.',
    inputSchema: {
      signedYear: z.number().optional().describe('Negative = BCE'),
      year: z.number().optional(),
      eventId: z.string().optional(),
      refYear: z.number().int().optional(),
      blipAdjust: z.boolean().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpComputeYearsAgo({
    signedYear: typeof args.signedYear === 'number' ? args.signedYear : undefined,
    year: typeof args.year === 'number' ? args.year : undefined,
    eventId: typeof args.eventId === 'string' ? args.eventId : undefined,
    refYear: typeof args.refYear === 'number' ? args.refYear : undefined,
    blipAdjust: typeof args.blipAdjust === 'boolean' ? args.blipAdjust : undefined,
  }))

  registerJsonTool(server, 'get_event_dates', {
    description: 'Timeline event dates (project + mainstream when authored) and elapsed time.',
    inputSchema: {
      eventId: z.string().optional(),
      titleQuery: z.string().optional(),
    },
    annotations: readOnly,
  }, (args) => mcpGetEventDates({
    eventId: typeof args.eventId === 'string' ? args.eventId : undefined,
    titleQuery: typeof args.titleQuery === 'string' ? args.titleQuery : undefined,
  }))

  registerJsonTool(server, 'submit_investigation_idea', {
    description:
      'Submit a visitor-proposed topic for site investigation (text + optional http(s) URLs; no images). Confirm with the user before calling.',
    inputSchema: {
      topic: z.string().min(3).max(200),
      description: z.string().min(20).max(5000),
      urls: z.array(z.string()).max(10).optional().describe('Optional http(s) reference links'),
      email: z.string().email().optional().describe('Optional contact email when not anonymous'),
      is_anonymous: z.boolean().optional(),
      search_query: z.string().max(500).optional().describe('Optional search context that led to this request'),
    },
  }, (args) => mcpSubmitInvestigationIdea(args, submitClientKey))

  registerJsonTool(server, 'submit_chat_comment', {
    description:
      'Post a comment to a Paradigm Threat chat channel (Relay git on chat/public branch). Confirm with the user before calling.',
    inputSchema: {
      channel: z.string().min(1).max(200),
      content: z.string().min(1).max(1024),
      author: z.string().min(1).max(18).optional(),
      username: z.string().min(1).max(18).optional(),
      is_anonymous: z.boolean().optional(),
      anonymous: z.boolean().optional(),
    },
  }, (args) => mcpSubmitChatComment(args, submitClientKey))

  return server
}
