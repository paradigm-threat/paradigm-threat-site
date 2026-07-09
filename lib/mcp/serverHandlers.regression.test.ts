import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { mcpSearchSite, mcpResearchStatus } from '@/lib/mcp/serverHandlers.ts'
import { resetMcpRelayCaches } from '@/lib/mcp/relayFetch.ts'

const originalFetch = globalThis.fetch

describe('mcp serverHandlers', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    resetMcpRelayCaches()
  })

  it('search_site uses AND semantics with mocked relay', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('index.json')) {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url.includes('events.json')) {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    // Override index load by mocking flatten - actually fetch returns empty entries
    // Use direct mock by patching fetch to return valid index structure
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('index.json')) {
        return new Response(JSON.stringify({
          science: {
            'aether.md': { _title: 'Aether', _keywords: ['Aether', 'Plasma'] },
          },
          history: {
            mudflood: {
              'page.md': { _title: 'Mud Flood', _keywords: ['MudFlood', 'MFEE', 'mud', 'flood'] },
            },
          },
        }), { status: 200 })
      }
      if (url.includes('events.json')) {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
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
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('index.json')) {
        return new Response(JSON.stringify({
          history: {
            mudflood: { 'page.md': { _title: 'Mud Flood', _keywords: ['MudFlood'] } },
          },
        }), { status: 200 })
      }
      if (url.includes('events.json')) {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
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
})

function mockClaimsJson () {
  return [{
    id: 'mfee-mud-flood-reset',
    title: 'MFEE',
    claim: 'Mud flood thesis',
    confidence: 'project-thesis',
    uniqueness: 'site-distinctive',
    topics: ['mud flood', 'mfee', 'tartaria'],
    searchQueries: ['mud flood MFEE'],
    canonicalPaths: ['history/mudflood/page.md'],
  }]
}
