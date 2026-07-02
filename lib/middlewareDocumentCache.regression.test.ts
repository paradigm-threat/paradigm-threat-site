import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldCacheDocumentPath } from './middlewareDocumentCache.ts'

describe('shouldCacheDocumentPath', () => {
  it('caches article and hub paths', () => {
    assert.equal(shouldCacheDocumentPath('/'), true)
    assert.equal(shouldCacheDocumentPath('/blog/foo'), true)
    assert.equal(
      shouldCacheDocumentPath('/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'),
      true,
    )
  })

  it('skips interactive and API paths', () => {
    assert.equal(shouldCacheDocumentPath('/api/foo'), false)
    assert.equal(shouldCacheDocumentPath('/chat'), false)
    assert.equal(shouldCacheDocumentPath('/search'), false)
    assert.equal(shouldCacheDocumentPath('/timeline/evt-x'), false)
    assert.equal(shouldCacheDocumentPath('/submit'), false)
    assert.equal(shouldCacheDocumentPath('/files/foo'), false)
    assert.equal(shouldCacheDocumentPath('/_next/data/x'), false)
  })
})
