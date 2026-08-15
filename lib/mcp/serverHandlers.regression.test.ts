import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { mcpSearchSite, mcpResearchStatus, mcpGetSiteClaims, mcpSubmitInvestigationIdea, mcpSubmitChatComment } from '@/lib/mcp/serverHandlers.ts'
import { resetMcpRelayCaches } from '@/lib/mcp/relayFetch.ts'
import { resetInvestigationSubmitRateLimitForTests } from '@/lib/investigationSubmission/rateLimit.ts'
import { resetChatSubmitRateLimitForTests } from '@/lib/chatSubmission/rateLimit.ts'

const originalFetch = globalThis.fetch

function queryEnvelope (results: Record<string, unknown>[]) {
  return {
    results,
    collection: 'index',
    query: '',
    count: results.length,
    docCount: results.length,
    status: 'ok',
    indexFresh: true,
  }
}

describe('mcp serverHandlers', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    resetMcpRelayCaches()
    resetInvestigationSubmitRateLimitForTests()
    resetChatSubmitRateLimitForTests()
  })

  it('search_site uses AND semantics with mocked relay QUERY', async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (method === 'QUERY' && url.includes('paradigm-threat-files')) {
        return new Response(JSON.stringify(queryEnvelope([
          {
            path: 'science/aether.md',
            _title: 'Aether',
            _keywords: ['Aether', 'Plasma'],
            title: 'Aether',
          },
          {
            path: 'history/mudflood/page.md',
            _title: 'Mud Flood',
            _keywords: ['MudFlood', 'MFEE', 'mud', 'flood'],
            title: 'Mud Flood',
          },
        ])), { status: 200 })
      }
      if (method === 'QUERY' && url.includes('paradigm-threat-timeline')) {
        return new Response(JSON.stringify(queryEnvelope([])), { status: 200 })
      }
      if (url.includes('site-claims.json')) {
        return new Response(JSON.stringify([]), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const result = await mcpSearchSite({ query: 'mud flood MFEE', limit: 10 })
    assert.ok(!('error' in result && result.error))
    const r = result as { count: number; results: { path: string }[] }
    assert.ok(r.count >= 1)
    assert.ok(r.results.some((x) => x.path.includes('mudflood')))
  })

  it('research_status returns envelope shape', async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()
      if (method === 'QUERY' && url.includes('paradigm-threat-files')) {
        return new Response(JSON.stringify(queryEnvelope([
          {
            path: 'history/mudflood/page.md',
            _title: 'Mud Flood',
            _keywords: ['MudFlood'],
            title: 'Mud Flood',
          },
        ])), { status: 200 })
      }
      if (method === 'QUERY' && url.includes('paradigm-threat-timeline')) {
        return new Response(JSON.stringify(queryEnvelope([])), { status: 200 })
      }
      if (url.includes('site-claims.json')) {
        return new Response(JSON.stringify(mockClaimsJson()), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const env = await mcpResearchStatus({ question: 'mud flood MFEE tartaria' })
    assert.ok(env.coverage)
    assert.ok(Array.isArray(env.suggestedNextSteps))
    assert.ok(Array.isArray(env.citableSources))
  })

  it('get_site_claims requires query or id and matches iran-style stems', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('site-claims.json')) {
        return new Response(JSON.stringify(mockClaimsJson()), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const missing = await mcpGetSiteClaims({})
    assert.ok('error' in missing && String(missing.error).includes('query'))

    const byId = await mcpGetSiteClaims({ id: 'mfee-mud-flood-reset' })
    assert.ok(!('error' in byId && byId.error))
    assert.equal((byId as { claims: { id: string }[] }).claims[0]?.id, 'mfee-mud-flood-reset')

    const byQuery = await mcpGetSiteClaims({ query: ['mud', 'flood'] })
    assert.ok(!('error' in byQuery && byQuery.error))
    assert.ok((byQuery as { claims: { id: string }[] }).claims.some((c) => c.id === 'mfee-mud-flood-reset'))
  })

  it('submit_investigation_idea rejects short description', async () => {
    const result = await mcpSubmitInvestigationIdea({
      topic: 'RFK staging',
      description: 'too short',
    })
    assert.ok('error' in result && result.error)
    assert.match(String((result as { error: string }).error), /description|Invalid|at least/i)
  })

  it('submit_chat_comment rejects missing channel', async () => {
    const result = await mcpSubmitChatComment({ content: 'hello world' })
    assert.ok('error' in result && result.error)
  })
})

function mockClaimsJson () {
  return [{
    id: 'mfee-mud-flood-reset',
    title: 'MFEE',
    claim: 'Mud flood thesis',
    confidence: 'project-thesis',
    uniqueness: 'site-distinctive',
    topics: ['mud flood', 'mfee'],
    searchQueries: ['mud flood MFEE'],
    canonicalPaths: ['history/mudflood/page.md'],
    demoQuestions: ['What is the mud flood MFEE thesis?'],
  }]
}
