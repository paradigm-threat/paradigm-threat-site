import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { flattenFilesIndex } from '../components/helpers/indexHelper.ts'
import {
  DEFAULT_SEARCH_CONTENT_FILTERS,
  filterIndexedEntriesByQuery,
  isBlogSearchPath,
  isExcludedBySearchContentFilters,
  isNonArticleMdPath,
  searchTermMatchesHaystack,
} from './searchIndexFilter.ts'

describe('isBlogSearchPath', () => {
  it('matches blog root and descendants', () => {
    assert.equal(isBlogSearchPath('blog'), true)
    assert.equal(isBlogSearchPath('blog/post.md'), true)
    assert.equal(isBlogSearchPath('history/blog'), false)
  })
})

describe('isNonArticleMdPath', () => {
  it('matches section index files only', () => {
    assert.equal(isNonArticleMdPath('cosmos/mars/page.md'), true)
    assert.equal(isNonArticleMdPath('science/index.mdx'), true)
    assert.equal(isNonArticleMdPath('blog/post.md'), false)
    assert.equal(isNonArticleMdPath('history/foo.md'), false)
  })
})

describe('filterIndexedEntriesByQuery content filters', () => {
  const entries: IndexedPathEntry[] = [
    { path: 'history/nixon.md', searchText: 'history nixon' },
    { path: 'blog/nixon-era.md', searchText: 'blog nixon era' },
    { path: 'cosmos/mars/page.md', searchText: 'cosmos mars page' },
    { path: 'blog', searchText: 'blog' },
  ]

  it('excludes blog and section pages by default filters', () => {
    const results = filterIndexedEntriesByQuery(entries, 'nixon', DEFAULT_SEARCH_CONTENT_FILTERS)
    assert.deepEqual(results.map((r) => r.path), ['history/nixon.md'])
  })

  it('includes blog when enabled', () => {
    const results = filterIndexedEntriesByQuery(entries, 'nixon', {
      includeBlog: true,
      includeNonArticleMd: false,
    })
    assert.ok(results.some((r) => r.path === 'blog/nixon-era.md'))
  })

  it('includes section pages when enabled', () => {
    const results = filterIndexedEntriesByQuery(entries, 'mars', {
      includeBlog: false,
      includeNonArticleMd: true,
    })
    assert.ok(results.some((r) => r.path === 'cosmos/mars/page.md'))
  })

  it('does not filter when content filters omitted', () => {
    const results = filterIndexedEntriesByQuery(entries, 'blog')
    assert.ok(results.some((r) => r.path === 'blog/nixon-era.md'))
    assert.ok(results.some((r) => r.path === 'blog'))
  })
})

describe('isExcludedBySearchContentFilters', () => {
  it('respects individual toggles', () => {
    assert.equal(
      isExcludedBySearchContentFilters('blog/x.md', DEFAULT_SEARCH_CONTENT_FILTERS),
      true,
    )
    assert.equal(
      isExcludedBySearchContentFilters('blog/x.md', { includeBlog: true, includeNonArticleMd: false }),
      false,
    )
    assert.equal(
      isExcludedBySearchContentFilters('foo/page.md', DEFAULT_SEARCH_CONTENT_FILTERS),
      true,
    )
  })
})

describe('searchTermMatchesHaystack', () => {
  it('aliases 911 and 9/11', () => {
    assert.equal(searchTermMatchesHaystack('911', 'thesis (9/11)'), true)
    assert.equal(searchTermMatchesHaystack('9/11', 'ae911truth petition'), true)
    assert.equal(searchTermMatchesHaystack('physics', 'structural physics claims'), true)
  })
})

describe('filterIndexedEntriesByQuery body snippet indexing', () => {
  const gagePath =
    'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md'

  it('matches body terms from _searchSnippet when flattened', () => {
    const index = {
      events: {
        false_flag: {
          investigations: {
            'richard-gage-ae911truth-controlled-demolition-investigation.md': {
              _title: 'Investigation: Richard Gage (9/11)',
              _keywords: ['911', 'Demolition'],
              _searchSnippet:
                'DEW physics fails; structural and forensic claims associated with Richard Gage',
            },
          },
        },
      },
    }
    const flat = flattenFilesIndex(index)
    const entry = flat.find((e) => e.path === gagePath)
    assert.ok(entry)
    const hits = filterIndexedEntriesByQuery(flat, '911 physics')
    assert.ok(hits.some((h) => h.path === gagePath))
  })
})
