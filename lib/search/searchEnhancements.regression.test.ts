import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { DEFAULT_SEARCH_CONTENT_FILTERS } from '@/lib/searchIndexFilter'
import { installSiteClaimsFixture } from '@/lib/siteAi/siteClaimsTestFixtures'
import { resetSiteClaimsCache, setSiteClaimsIndexOverride } from '@/lib/siteAi/siteClaimsStore'
import {
  buildSearchFollowUpQuestions,
  getLowResultsHints,
  getRelatedKeywords,
  partitionArticleHits,
} from './searchEnhancements.ts'

before(() => installSiteClaimsFixture())
after(() => {
  setSiteClaimsIndexOverride(null)
  resetSiteClaimsCache()
})

const entries: IndexedPathEntry[] = [
  {
    path: 'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md',
    searchText: 'events false flag investigations richard gage ae911truth controlled demolition investigation physics forensic 9/11',
  },
  {
    path: 'events/false_flag/investigations/ic911a-911revision-controlled-demolition-investigation.md',
    searchText: 'events false flag investigations ic911a 911 revision controlled demolition physics 9/11',
  },
  {
    path: 'cosmos/mars-dagger.md',
    searchText: 'cosmos mars dagger water geology',
  },
]

describe('searchEnhancements', () => {
  it('getRelatedKeywords returns co-occurring terms', () => {
    const related = getRelatedKeywords(entries, '911 physics', DEFAULT_SEARCH_CONTENT_FILTERS)
    assert.ok(related.length > 0)
    assert.ok(related.some((t) => t.includes('demolition') || t.includes('forensic')))
    assert.ok(!related.includes('events'))
    assert.ok(!related.includes('jpg'))
    assert.ok(!related.some((t) => t.includes('tl;dr')))
  })

  it('getLowResultsHints when hit count is low', () => {
    const hints = getLowResultsHints(entries, 'mars dagger', DEFAULT_SEARCH_CONTENT_FILTERS, 1)
    assert.ok(hints)
    assert.match(hints.message, /Few matches|No exact/)
  })

  it('partitionArticleHits re-sorts primary by score', () => {
    const andHits = entries.filter((e) => e.path.includes('investigation'))
    const { primary, suggested } = partitionArticleHits(
      andHits,
      entries,
      '911 physics',
      DEFAULT_SEARCH_CONTENT_FILTERS,
    )
    assert.equal(primary.length, 2)
    assert.ok(primary[0]!.path.includes('gage') || primary[0]!.path.includes('ic911a'))
  })

  it('buildSearchFollowUpQuestions returns deduped strings', () => {
    const qs = buildSearchFollowUpQuestions('911 physics', ['demolition', 'forensic'])
    assert.ok(qs.length >= 2)
    const lower = qs.map((q) => q.toLowerCase())
    assert.equal(lower.length, new Set(lower).size)
  })
})
