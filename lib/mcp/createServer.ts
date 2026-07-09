import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
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
} from '@/lib/mcp/serverHandlers'

function jsonResult (data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

function registerSearchTools (server: McpServer) {
  const searchSchema = {
    query: z.string().min(2).describe('Space-separated terms; ALL must match'),
    limit: z.number().int().min(1).max(50).optional(),
    includeBlog: z.boolean().optional(),
    includeSectionPages: z.boolean().optional(),
  }

  const runSearch = async (args: {
    query: string
    limit?: number
    includeBlog?: boolean
    includeSectionPages?: boolean
  }) => jsonResult(await mcpSearchSite(args))

  server.registerTool(
    'search_site',
    {
      description: 'Search paradigm-threat articles and timeline events by keyword (AND filter, title-aware rank).',
      inputSchema: searchSchema,
      annotations: { readOnlyHint: true },
    },
    runSearch,
  )

  server.registerTool(
    'search',
    {
      description: 'ChatGPT deep-research alias for search_site.',
      inputSchema: searchSchema,
      annotations: { readOnlyHint: true },
    },
    runSearch,
  )
}

export function createParadigmThreatMcpServer (): McpServer {
  const server = new McpServer({
    name: 'paradigm-threat-research',
    version: '0.1.0',
  })

  registerSearchTools(server)

  server.registerTool(
    'fetch',
    {
      description: 'ChatGPT deep-research alias: article metadata + optional body preview by repo path.',
      inputSchema: {
        path: z.string().describe('Repo-relative path e.g. history/mudflood/page.md'),
        includeBodyPreview: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpGetArticleContext(args)),
  )

  server.registerTool(
    'get_site_claims',
    {
      description: 'Match a question to curated site thesis cards (site-claims.json).',
      inputSchema: {
        query: z.string().optional(),
        id: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpGetSiteClaims(args)),
  )

  server.registerTool(
    'get_project_perspective',
    {
      description: 'Paradigm Threat worldview seed (voice, not evidence).',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult(mcpGetProjectPerspective()),
  )

  server.registerTool(
    'get_article_context',
    {
      description: 'TL;DR, keywords, canonical URL for an article path.',
      inputSchema: {
        path: z.string(),
        includeBodyPreview: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpGetArticleContext(args)),
  )

  server.registerTool(
    'read_article',
    {
      description: 'Paginated markdown body for an article or timeline path.',
      inputSchema: {
        path: z.string(),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(500).max(40000).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpReadArticle(args)),
  )

  server.registerTool(
    'research_status',
    {
      description: 'Coverage check: search + site claims + gaps before deep read. Returns ResearchEnvelope with honest not_in_corpus when applicable.',
      inputSchema: {
        question: z.string().min(3),
        includeBlog: z.boolean().optional(),
        expandKeywords: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpResearchStatus(args)),
  )

  server.registerTool(
    'get_chronology_framework',
    {
      description: 'NC / Blip / Scaligerian glossary and elapsed-time rules (static).',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => jsonResult(mcpGetChronologyFramework()),
  )

  server.registerTool(
    'compute_years_ago',
    {
      description: 'Elapsed calendar years and blip-adjusted span from signed year or eventId to now.',
      inputSchema: {
        signedYear: z.number().optional().describe('Negative = BCE'),
        year: z.number().optional(),
        eventId: z.string().optional(),
        refYear: z.number().int().optional(),
        blipAdjust: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpComputeYearsAgo(args)),
  )

  server.registerTool(
    'get_event_dates',
    {
      description: 'Timeline event dates (project + mainstream when authored) and elapsed time.',
      inputSchema: {
        eventId: z.string().optional(),
        titleQuery: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => jsonResult(await mcpGetEventDates(args)),
  )

  return server
}
