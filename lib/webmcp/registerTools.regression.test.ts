import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

describe('registerTools WEBMCP_TOOL_NAMES', () => {
  const prevAct = process.env.NEXT_PUBLIC_WEBMCP_ACTUATION

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WEBMCP_ACTUATION = '1'
  })

  afterEach(() => {
    if (prevAct === undefined) delete process.env.NEXT_PUBLIC_WEBMCP_ACTUATION
    else process.env.NEXT_PUBLIC_WEBMCP_ACTUATION = prevAct
  })

  it('includes reply investigation tools and omits removed draft_reply_to_text', async () => {
    const { WEBMCP_TOOL_NAMES } = await import('./registerTools.ts')
    const required = [
      'search_site',
      'get_project_perspective',
      'get_site_claims',
      'prepare_reply_context',
      'read_article',
      'list_index_entries',
      'format_reply_citations',
      'find_articles_for_text',
      'copy_to_clipboard',
    ]
    for (const name of required) {
      assert.ok(WEBMCP_TOOL_NAMES.includes(name), `missing tool: ${name}`)
    }
    assert.equal(WEBMCP_TOOL_NAMES.includes('draft_reply_to_text'), false)
    assert.ok(WEBMCP_TOOL_NAMES.includes('submit_investigation_idea'))
    assert.ok(WEBMCP_TOOL_NAMES.includes('prepare_illustration_prompt'))
  })
})
