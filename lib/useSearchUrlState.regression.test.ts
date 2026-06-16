import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { searchPathForQuery } from './useSearchUrlState.ts'

describe('searchPathForQuery', () => {
  it('returns /search for empty query', () => {
    assert.equal(searchPathForQuery(''), '/search')
    assert.equal(searchPathForQuery('   '), '/search')
  })

  it('uses path segment for single-token queries', () => {
    assert.equal(searchPathForQuery('cell'), '/search/cell')
    assert.equal(searchPathForQuery('panhf'), '/search/panhf')
  })

  it('encodes special characters in single-token queries', () => {
    assert.equal(searchPathForQuery('foo/bar'), '/search/foo%2Fbar')
  })

  it('uses ?q= for multi-word queries', () => {
    assert.equal(searchPathForQuery('cell biology'), '/search?q=cell%20biology')
    assert.equal(searchPathForQuery('  mars water  '), '/search?q=mars%20water')
  })
})
