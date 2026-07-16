import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { catalogLeafAtPath, shortCommitTitle } from './catalogLeafAtPath.ts'
import { formatIndexDateTiny, formatIndexDateWithLocalTime } from './indexUpdated.ts'

describe('catalogLeafAtPath', () => {
  const tree = {
    events: {
      _count: 1,
      jfk: {
        _count: 1,
        'jfk-was-never-assassinated.md': {
          _updated: '2026-07-16T14:15:00Z',
          _commit: 'abcdef0123456789abcdef0123456789abcdef01',
          _title: 'JFK Was Never Assassinated',
          content_kind: 'article',
        },
      },
    },
  }

  it('resolves nested md leaf meta', () => {
    const leaf = catalogLeafAtPath(tree, 'events/jfk/jfk-was-never-assassinated.md')
    assert.ok(leaf)
    assert.equal(leaf._title, 'JFK Was Never Assassinated')
    assert.equal(leaf._updated, '2026-07-16T14:15:00Z')
    assert.equal(typeof leaf._commit, 'string')
  })

  it('accepts leading slash on path', () => {
    const leaf = catalogLeafAtPath(tree, '/events/jfk/jfk-was-never-assassinated.md')
    assert.ok(leaf)
    assert.equal(leaf._commit, 'abcdef0123456789abcdef0123456789abcdef01')
  })

  it('returns null for directory nodes', () => {
    assert.equal(catalogLeafAtPath(tree, 'events/jfk'), null)
  })

  it('returns null for missing paths and empty input', () => {
    assert.equal(catalogLeafAtPath(tree, 'events/missing.md'), null)
    assert.equal(catalogLeafAtPath(null, 'events/jfk/jfk-was-never-assassinated.md'), null)
    assert.equal(catalogLeafAtPath(tree, ''), null)
    assert.equal(catalogLeafAtPath(tree, '   '), null)
  })
})

describe('shortCommitTitle', () => {
  it('shortens a full hash', () => {
    assert.equal(
      shortCommitTitle('abcdef0123456789abcdef0123456789abcdef01'),
      'Commit abcdef0',
    )
  })

  it('returns null for missing or blank', () => {
    assert.equal(shortCommitTitle(undefined), null)
    assert.equal(shortCommitTitle(''), null)
    assert.equal(shortCommitTitle('   '), null)
    assert.equal(shortCommitTitle(12), null)
  })
})

describe('article updated header date source', () => {
  it('formats catalog _updated with local date and time', () => {
    const leaf = catalogLeafAtPath(
      {
        a: {
          'page.md': { _updated: '2026-07-16T14:15:00Z', _commit: 'aabbccddeeff00112233445566778899aabbccdd' },
        },
      },
      'a/page.md',
    )
    const label = formatIndexDateWithLocalTime(leaf?._updated)
    assert.ok(label)
    assert.match(label, /2026/)
    // Hour:minute present (locale-dependent separators / am-pm)
    assert.match(label, /\d{1,2}:\d{2}/)
    assert.equal(shortCommitTitle(leaf?._commit), 'Commit aabbccd')
  })

  it('keeps compact index dates date-only', () => {
    const tiny = formatIndexDateTiny('2026-07-16T14:15:00Z')
    assert.ok(tiny)
    assert.match(tiny, /2026/)
    assert.doesNotMatch(tiny, /\d{1,2}:\d{2}/)
  })

  it('omits commit title when only _updated is present', () => {
    const leaf = catalogLeafAtPath(
      { 'solo.md': { _updated: '2026-01-01T00:00:00Z' } },
      'solo.md',
    )
    assert.ok(formatIndexDateWithLocalTime(leaf?._updated))
    assert.equal(shortCommitTitle(leaf?._commit), null)
  })
})
