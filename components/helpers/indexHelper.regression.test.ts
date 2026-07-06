import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { flattenFilesIndex } from './indexHelper.ts'

describe('flattenFilesIndex', () => {
  it('builds searchText from path, title, and keywords only (no body snippet)', () => {
    const index = {
      science: {
        'sample.md': {
          _title: 'Sample Article',
          _keywords: ['Mars', 'Portal'],
          _searchSnippet: 'This legacy field must be ignored for search indexing.',
        },
      },
    }
    const entry = flattenFilesIndex(index).find((e) => e.path === 'science/sample.md')
    assert.ok(entry)
    assert.match(entry.searchText, /Sample Article/)
    assert.match(entry.searchText, /Mars/)
    assert.equal(entry.searchText.includes('legacy field'), false)
    assert.equal(entry.searchText.includes('ignored'), false)
  })
})
