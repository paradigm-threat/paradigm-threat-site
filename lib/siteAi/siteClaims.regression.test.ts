import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { SITE_AI_EXAMPLE_QUESTIONS } from './siteAiExampleQuestions.ts'
import { getSiteClaimById, getSiteClaimsIndexCached } from './siteClaimsIndex.ts'
import { installSiteClaimsFixture } from './siteClaimsTestFixtures.ts'
import { resetSiteClaimsCache, setSiteClaimsIndexOverride } from './siteClaimsStore.ts'
import {
  claimsAgentInstructions,
  matchSiteClaims,
} from './matchSiteClaims.ts'

before(() => installSiteClaimsFixture())
after(() => {
  setSiteClaimsIndexOverride(null)
  resetSiteClaimsCache()
})

describe('siteClaimsIndex', () => {
  it('includes hub and demo claims', () => {
    const index = getSiteClaimsIndexCached()
    assert.ok(index.length >= 20)
    assert.ok(getSiteClaimById('giants-fate'))
    assert.ok(getSiteClaimById('ufos-two-camps'))
    assert.ok(getSiteClaimById('pole-shift-ruled-out'))
  })

  it('every demo question matches at least one claim', () => {
    const claims = getSiteClaimsIndexCached()
    for (const q of SITE_AI_EXAMPLE_QUESTIONS) {
      const matched = matchSiteClaims(q, { maxResults: 3, claims })
      assert.ok(matched.length >= 1, `no claim for demo question: ${q}`)
      assert.ok(matched[0]!.matchScore >= 100, `weak demo match for: ${q}`)
    }
  })

  it('matches giants question to giants-fate', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('What happened to the giants?', { claims })
    assert.equal(matched[0]?.id, 'giants-fate')
    assert.ok(matched[0]!.canonicalPaths.some((p) => p.includes('history-qa')))
    assert.ok(matched[0]!.doNotSay?.some((s) => s.includes('definitive')))
  })

  it('matches short earth-age question', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('How old is the earth?', { claims })
    assert.ok(matched.some((c) => c.id === 'earth-age-young'))
  })

  it('matches DEW poison-the-well and Mythos dump-and-cover questions', () => {
    const claims = getSiteClaimsIndexCached()
    const dew = matchSiteClaims('Why is the Judy Wood DEW theory called poison the well in 9/11 truth?', { claims })
    assert.ok(dew.some((c) => c.id === 'dew-poison-well-911'))
    const mythos = matchSiteClaims('Was the NSA Anthropic Mythos hack story choreography to dump commercial AI?', { claims })
    assert.ok(mythos.some((c) => c.id === 'mythos-dump-and-cover'))
    const bypass = matchSiteClaims('How does DEW bypass the no-planes debate in 9/11 truth?', { claims })
    assert.ok(bypass.some((c) => c.id === 'dew-no-planes-bypass'))
    const antibody = matchSiteClaims('What is the good-actor antibody theory of 9/11?', { claims })
    assert.ok(antibody.some((c) => c.id === '911-good-actor-antibody'))
  })

  it('matches JFK fake-assassination thesis', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('Was JFK really assassinated in Dallas?', { claims })
    assert.equal(matched[0]?.id, 'jfk-fake-assassination')
    assert.ok(getSiteClaimById('jfk-fake-assassination'))
    const literal = matchSiteClaims('JFK was never assassinated', { claims })
    assert.ok(literal.some((c) => c.id === 'jfk-fake-assassination'))
  })

  it('claimsAgentInstructions references read_article', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('What happened to the giants?', { claims })
    const instr = claimsAgentInstructions(matched)
    assert.ok(instr.includes('read_article'))
    assert.ok(instr.includes('doNotSay'))
  })
})
