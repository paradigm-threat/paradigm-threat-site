import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'
import { buildResearchStatus } from '@/lib/mcp/researchEnvelope.ts'

const mockIndex: IndexedPathEntry[] = [
  { path: 'history/mudflood/page.md', searchText: 'history/mudflood/page.md Mud Flood MFEE Tartaria' },
  { path: 'science/aether.md', searchText: 'science/aether.md Aether Maxwell plasma' },
  { path: 'timeline/evt-test', searchText: 'evt-test Golden mud flood' },
]

const mockClaims: SiteClaimEntry[] = [
  {
    id: 'mfee-mud-flood-reset',
    title: 'Mud Flood Energetic Event',
    claim: 'MFEE thesis',
    confidence: 'project-thesis',
    uniqueness: 'site-distinctive',
    topics: ['mud flood', 'mudflood', 'mfee', 'tartaria'],
    searchQueries: ['mud flood MFEE'],
    canonicalPaths: ['history/mudflood/page.md'],
    answerOpener: 'This site reads the mud flood as MFEE.',
  },
]

describe('buildResearchStatus', () => {
  it('returns covered for strong mud flood question', () => {
    const env = buildResearchStatus({
      question: 'What is the mud flood MFEE thesis?',
      index: mockIndex,
      claims: mockClaims,
      expandKeywords: false,
    })
    assert.ok(['covered', 'partial'].includes(env.coverage))
    assert.ok(env.corpusHits.length >= 1)
    assert.equal(env.citableSources.length, 0)
  })

  it('uses a shorter stem when the full question AND misses', () => {
    const env = buildResearchStatus({
      question: 'two camps theory NSA CIA Hollywood',
      index: [
        {
          path: 'influence/hollywood/investigations/hollywood-two-camp-war-investigation.md',
          searchText: 'influence/hollywood/investigations/hollywood-two-camp-war-investigation.md Hollywood two-camp war NSA CIA',
        },
        {
          path: 'history/chronology/atlantis/theory.md',
          searchText: 'history/chronology/atlantis/theory.md atlantis theory',
        },
      ],
      claims: [],
    })
    assert.notEqual(env.coverage, 'not_in_corpus')
    assert.notEqual(env.confidence, 'high')
    assert.ok(env.searched.toolsCalled.includes('shorter_stem_search'))
    assert.ok(env.corpusHits.some((h) => h.path.includes('hollywood-two-camp-war-investigation')))
    assert.ok(env.suggestedNextSteps.some((s) => s.action === 'read_article'))
    assert.equal(env.suggestedNextSteps.some((s) => s.action === 'submit_investigation_idea'), false)
  })

  it('returns not_in_corpus for unrelated topic', () => {
    const env = buildResearchStatus({
      question: 'quantum computing bitcoin mining 2024',
      index: mockIndex,
      claims: mockClaims,
      expandKeywords: false,
    })
    assert.equal(env.coverage, 'not_in_corpus')
    assert.equal(env.citableSources.length, 0)
    assert.equal(env.hostMaySupplement, true)
    assert.ok(env.suggestedNextSteps.some((s) => s.action === 'external_search'))
  })

  it('rejects very short questions', () => {
    const env = buildResearchStatus({
      question: 'ab',
      index: mockIndex,
      claims: mockClaims,
    })
    assert.equal(env.coverage, 'not_in_corpus')
    assert.ok(env.gaps.some((g) => g.includes('3 characters')))
  })

  it('allows repo synthesis for author-thesis cards', () => {
    const env = buildResearchStatus({
      question: 'Could Stalin have stopped the Holodomor?',
      index: mockIndex,
      claims: [
        {
          id: 'stalin-holodomor-agency',
          title: 'Stalin Holodomor agency',
          claim: 'Stalin had agency.',
          confidence: 'author-thesis',
          uniqueness: 'site-distinctive',
          topics: ['stalin', 'holodomor'],
          searchQueries: ['stalin holodomor'],
          canonicalPaths: ['history/chronology/investigations/author-unique-theories.md'],
          demoQuestions: ['Could Stalin have stopped the Holodomor?'],
        },
      ],
      expandKeywords: false,
    })
    assert.equal(env.repoSynthesis?.allowed, true)
    assert.equal(env.repoSynthesis?.tier, 'author-thesis')
    assert.ok(env.matchedClaimIds?.includes('stalin-holodomor-agency'))
  })
})
