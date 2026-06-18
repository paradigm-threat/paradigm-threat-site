import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SITE_AI_EXAMPLE_QUESTIONS } from './siteAiExampleQuestions.ts'
import { SITE_CLAIMS_INDEX, getSiteClaimById } from './siteClaimsIndex.ts'
import {
  claimsAgentInstructions,
  matchSiteClaims,
} from './matchSiteClaims.ts'

describe('siteClaimsIndex', () => {
  it('includes hub and demo claims', () => {
    assert.ok(SITE_CLAIMS_INDEX.length >= 16)
    assert.ok(getSiteClaimById('giants-fate'))
    assert.ok(getSiteClaimById('ufos-two-camps'))
    assert.ok(getSiteClaimById('pole-shift-ruled-out'))
  })

  it('every demo question matches at least one claim', () => {
    for (const q of SITE_AI_EXAMPLE_QUESTIONS) {
      const matched = matchSiteClaims(q, { maxResults: 3 })
      assert.ok(matched.length >= 1, `no claim for demo question: ${q}`)
      assert.ok(matched[0]!.matchScore >= 100, `weak demo match for: ${q}`)
    }
  })

  it('matches giants question to giants-fate', () => {
    const matched = matchSiteClaims('What happened to the giants?')
    assert.equal(matched[0]?.id, 'giants-fate')
    assert.ok(matched[0]!.canonicalPaths.some((p) => p.includes('history-qa')))
    assert.ok(matched[0]!.doNotSay?.some((s) => s.includes('definitive')))
  })

  it('matches short earth-age question', () => {
    const matched = matchSiteClaims('How old is the earth?')
    assert.ok(matched.some((c) => c.id === 'earth-age-young'))
  })

  it('claimsAgentInstructions references read_article', () => {
    const matched = matchSiteClaims('What happened to the giants?')
    const instr = claimsAgentInstructions(matched)
    assert.ok(instr.includes('read_article'))
    assert.ok(instr.includes('doNotSay'))
  })
})
