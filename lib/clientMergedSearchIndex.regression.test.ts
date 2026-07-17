import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LUCKY_FILES_CONTENT_KINDS,
  LUCKY_TIMELINE_TYPES,
  pickRandomFeelingLuckyHref,
} from './clientMergedSearchIndex.ts'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

describe('pickRandomFeelingLuckyHref', () => {
  const entries: IndexedPathEntry[] = [
    { path: 'blog/foo.md', searchText: 'foo' },
    { path: 'timeline/evt-introduction', searchText: 'intro' },
    { path: 'assets/bar.png', searchText: 'bar' },
  ]

  it('returns site paths for md and timeline only', () => {
    const href = pickRandomFeelingLuckyHref(entries)
    assert.ok(href)
    assert.match(href!, /^\/(blog\/foo|timeline\/evt-introduction)$/)
  })

  it('returns null when no candidates', () => {
    assert.equal(pickRandomFeelingLuckyHref([{ path: 'x.png', searchText: 'x' }]), null)
  })
})

describe('Feeling Lucky server filter constants', () => {
  it('allowlists readable files content_kind values', () => {
    assert.deepEqual([...LUCKY_FILES_CONTENT_KINDS], [
      'article',
      'investigation',
      'blog',
    ])
    assert.ok(!LUCKY_FILES_CONTENT_KINDS.includes('exclude' as never))
  })

  it('allowlists timeline event/article types (not manifest)', () => {
    assert.deepEqual([...LUCKY_TIMELINE_TYPES], ['event', 'article'])
    assert.ok(!LUCKY_TIMELINE_TYPES.includes('manifest' as never))
  })
})
