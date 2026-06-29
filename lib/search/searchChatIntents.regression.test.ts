import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSearchChatIntent } from './searchChatIntents.ts'

describe('searchChatIntents submit-idea', () => {
  it('builds submission overlay for search context', () => {
    const built = buildSearchChatIntent({
      intent: 'submit-idea',
      searchContext: {
        query: 'mud flood',
        resultPaths: ['debunk/foo.md'],
        filters: { includeBlog: false, includeSectionPages: false },
      },
    })
    assert.match(built.userMessage, /mud flood/i)
    assert.match(built.systemPromptOverlay, /submit investigation idea/i)
    assert.match(built.systemPromptOverlay, /submit_investigation_idea/i)
  })
})
