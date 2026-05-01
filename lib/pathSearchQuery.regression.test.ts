import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  pathToSearchTerms,
  searchQueryCandidatesFromPath,
  hrefForSearchQuery,
  filterEntriesByPathQueries,
  suggestedNarrowQueryFromPath,
} from './pathSearchQuery.ts'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'

describe('pathToSearchTerms', () => {
  it('normalizes slashes hyphens underscores and strips md extension', () => {
    assert.equal(pathToSearchTerms('history/foo-bar/page.md'), 'history foo bar page')
  })

  it('falls back to last segment when normalized primary is under 2 chars', () => {
    assert.equal(pathToSearchTerms('z'), 'z')
  })
})

describe('hrefForSearchQuery', () => {
  it('uses path segment style when no spaces', () => {
    assert.equal(hrefForSearchQuery('cia investigation'), '/search?q=cia%20investigation')
    assert.equal(hrefForSearchQuery('nixon'), '/search/nixon')
  })
})

describe('filterEntriesByPathQueries', () => {
  const entries: IndexedPathEntry[] = [
    { path: 'blog/nixon-era.md', searchText: 'blog nixon era keywords nixon' },
    { path: 'other.md', searchText: 'other unrelated' },
  ]

  it('uses primary path terms when they match', () => {
    const { results, queryUsed, linkQuery } = filterEntriesByPathQueries(entries, 'blog/nixon-era')
    assert.ok(results.some((r) => r.path === 'blog/nixon-era.md'))
    assert.match(queryUsed, /nixon/i)
    assert.ok(linkQuery.length >= 2)
  })

  it('falls back to shorter query when primary matches nothing', () => {
    const narrow: IndexedPathEntry[] = [
      { path: 'deep/nixon-file.md', searchText: 'deep nixon file story' },
    ]
    const { results } = filterEntriesByPathQueries(narrow, 'missing/prefix/nixon-file')
    assert.ok(results.length > 0)
  })

  it('matches when one URL token is absent from index (OR overlap) and ranks higher scores first', () => {
    const gnm: IndexedPathEntry = {
      path: 'science/biology/investigations/gnm-learninggnm-cancer-paradigm-cluster-investigation.md',
      searchText:
        'science biology investigations gnm-learninggnm-cancer-paradigm-cluster-investigation.md Investigation German New Medicine Learninggnm',
    }
    const weak: IndexedPathEntry = {
      path: 'science/biology/investigations/readme.md',
      searchText: 'science biology investigations readme',
    }
    const pool = [weak, gnm]
    const slug =
      'science/biology/investigations/german-new-medicine-learninggnm-debunk'
    const { results, queryUsed, linkQuery } = filterEntriesByPathQueries(pool, slug)
    assert.ok(results.some((r) => r.path === gnm.path))
    assert.match(queryUsed, /learninggnm/i)
    assert.equal(linkQuery, 'learninggnm')
    assert.equal(results[0].path, gnm.path)
  })
})

describe('suggestedNarrowQueryFromPath', () => {
  it('prefers a distinctive token from the last slug segment', () => {
    assert.equal(
      suggestedNarrowQueryFromPath('science/biology/investigations/german-new-medicine-learninggnm-debunk'),
      'learninggnm'
    )
  })
})

describe('searchQueryCandidatesFromPath', () => {
  it('returns ordered distinct candidates', () => {
    const c = searchQueryCandidatesFromPath('a/b-c_d.md')
    assert.ok(c.length >= 1)
    assert.ok(c[0].includes('b') || c[0].includes('c'))
  })
})
