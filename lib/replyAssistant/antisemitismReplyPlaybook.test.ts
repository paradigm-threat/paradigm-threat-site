import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import {
  ANTISEMITISM_ATTACK_PROFILES,
  formatAntisemitismPlaybookForPrompt,
  matchAntisemitismAttacks,
} from './antisemitismReplyPlaybook.ts'
import { prepareReplyContext } from './prepareReplyContext.ts'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { installSiteClaimsFixture } from '../siteAi/siteClaimsTestFixtures.ts'
import { getSiteClaimsIndexCached, resetSiteClaimsCache, setSiteClaimsIndexOverride } from '../siteAi/siteClaimsStore.ts'

before(() => installSiteClaimsFixture())
after(() => {
  setSiteClaimsIndexOverride(null)
  resetSiteClaimsCache()
})

describe('antisemitismReplyPlaybook', () => {
  it('matches monolithing attack', () => {
    const m = matchAntisemitismAttacks('All Jews are evil and Satanic, prove it!')
    assert.ok(m.length >= 1)
    assert.equal(m[0]!.id, 'q01-monolithing')
    assert.ok(m[0]!.commandments.includes(2))
  })

  it('matches hitler rothschild trope', () => {
    const m = matchAntisemitismAttacks('Hitler was a Rothschild, wake up sheeple')
    assert.ok(m.some((x) => x.id === 'q02-hitler-rothschild'))
  })

  it('formats playbook JSON for agent', () => {
    const m = matchAntisemitismAttacks('Zionist rat hole is very deep on 9/11')
    const json = formatAntisemitismPlaybookForPrompt(m)
    assert.ok(json.includes('tenCommandmentsSummary'))
    assert.ok(json.includes('q05-zionist-rat-hole'))
  })

  it('covers eight tropes Q&A files', () => {
    assert.equal(ANTISEMITISM_ATTACK_PROFILES.length, 8)
  })
})

describe('replyAssistantContextCatalog', () => {
  it('derives UI rows from site claims and antisemitism playbook arrays', async () => {
    const { getReplyAssistantContextSections, articleIndexPathToHref } = await import(
      './replyAssistantContextCatalog.ts'
    )
    const sections = getReplyAssistantContextSections()
    const claims = sections.find((s) => s.id === 'site-claims')
    const playbook = sections.find((s) => s.id === 'antisemitism-playbook')
    assert.equal(claims?.rows.length, getSiteClaimsIndexCached().length)
    assert.equal(playbook?.rows.length, ANTISEMITISM_ATTACK_PROFILES.length + 2)
    assert.ok(articleIndexPathToHref('history/foo/page.md').endsWith('/history/foo'))
  })
})

describe('prepareReplyContext antisemitism', () => {
  const entries: IndexedPathEntry[] = [
    { path: 'history/chronology/qa/substack-tropes/q01-monolithing-inherited-evil.md', searchText: 'monolithing jews evil' },
    { path: 'history/chronology/investigations/paradigm-threat-working-definition-antisemitism.md', searchText: 'antisemitism ten commandments' },
  ]

  it('seeds playbook paths when attack detected', () => {
    const result = prepareReplyContext(entries, {
      sourceText: 'You people are Satanic Jews, all of you inherited evil from your bloodline.',
    })
    assert.ok(result.antisemitismPlaybook)
    assert.ok(result.agentInstructions.includes('Antisemitic attack pattern'))
    assert.ok(result.seedArticles.some((s) => s.path.includes('q01-monolithing')))
  })
})
