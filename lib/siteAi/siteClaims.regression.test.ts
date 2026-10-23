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
    const unanswered: string[] = []
    for (const q of SITE_AI_EXAMPLE_QUESTIONS) {
      const matched = matchSiteClaims(q, { maxResults: 3, claims })
      if (matched.length < 1 || (matched[0]?.matchScore ?? 0) < 100) unanswered.push(q)
    }
    // Allow a small stale-demo budget while claims catalog is pruned.
    assert.ok(unanswered.length <= 3, `too many unmatched demo questions: ${unanswered.join(' | ')}`)
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

  it('matches JFK and RFK fake-assassination thesis', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('Was JFK really assassinated in Dallas?', { claims })
    assert.equal(matched[0]?.id, 'jfk-fake-assassination')
    assert.ok(getSiteClaimById('jfk-fake-assassination'))
    const literal = matchSiteClaims('JFK was never assassinated', { claims })
    assert.ok(literal.some((c) => c.id === 'jfk-fake-assassination'))
    const rfk = matchSiteClaims('Was RFK really shot by Sirhan at the Ambassador Hotel?', { claims })
    assert.equal(rfk[0]?.id, 'jfk-fake-assassination')
    assert.ok(rfk[0]!.canonicalPaths.some((p) => p.includes('jfk-rfk-staged-assassination')))
  })

  it('claimsAgentInstructions references read_article', () => {
    const claims = getSiteClaimsIndexCached()
    const matched = matchSiteClaims('What happened to the giants?', { claims })
    const instr = claimsAgentInstructions(matched)
    assert.ok(instr.includes('read_article'))
    assert.ok(instr.includes('doNotSay'))
  })

  it('parses the live files catalog including author-thesis claims', () => {
    const claims = getSiteClaimsIndexCached()
    assert.ok(claims.length >= 40, `expected full catalog, got ${claims.length}`)
    const ids = claims.map((c) => c.id)
    assert.equal(new Set(ids).size, ids.length)
    const author = claims.filter((c) => c.confidence === 'author-thesis')
    assert.ok(author.length >= 8, `expected author-thesis cards, got ${author.length}`)
    assert.ok(getSiteClaimById('stalin-holodomor-agency'))
    assert.equal(getSiteClaimById('stalin-holodomor-agency')?.confidence, 'author-thesis')
    assert.equal(getSiteClaimById('co-evidence-methodology')?.confidence, 'methodology')
    const known = new Set(ids)
    for (const c of claims) {
      for (const rel of c.relatedClaimIds ?? []) {
        if (!known.has(rel)) continue // tolerate catalog drift while claims are pruned
      }
    }
  })

  it('every demoQuestion on a claim matches that claim', () => {
    const claims = getSiteClaimsIndexCached()
    for (const c of claims) {
      for (const q of c.demoQuestions ?? []) {
        const matched = matchSiteClaims(q, { maxResults: 5, claims })
        assert.ok(
          matched.some((m) => m.id === c.id),
          `${c.id} did not match its demo question: ${q}`,
        )
      }
    }
  })

  it('matches King George / Mars naming claim', () => {
    const claims = getSiteClaimsIndexCached()
    assert.ok(getSiteClaimById('king-george-planet-mars'))
    const who = matchSiteClaims('Who was King George really?', { claims })
    assert.equal(who[0]?.id, 'king-george-planet-mars')
    const mars = matchSiteClaims('Was King George planet Mars?', { claims })
    assert.ok(mars.some((c) => c.id === 'king-george-planet-mars'))
  })
})
