import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pickRandomFeelingLuckyHref } from './clientMergedSearchIndex.ts'
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
