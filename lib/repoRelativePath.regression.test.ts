import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('joinRepoRelativePath', () => {
  it('does not duplicate repo dir when src is already repo-root-relative under mirror article base', async () => {
    const { joinRepoRelativePath } = await import('./repoRelativePath.ts')
    const base =
      'https://paradigm-threat-files.atlanta2.relaygateway.net/events/false_flag/investigations'
    const src =
      '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png?w=1200'
    assert.equal(
      joinRepoRelativePath(base, src),
      'https://paradigm-threat-files.atlanta2.relaygateway.net/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png?w=1200',
    )
  })

  it('does not duplicate path segments for directory basePath + redundant relative src', async () => {
    const { joinRepoRelativePath } = await import('./repoRelativePath.ts')
    assert.equal(
      joinRepoRelativePath(
        'events/false_flag/investigations',
        'events/false_flag/investigations/foo.png',
      ),
      '/events/false_flag/investigations/foo.png',
    )
  })

  it('joins relative src under path basePath', async () => {
    const { joinRepoRelativePath } = await import('./repoRelativePath.ts')
    assert.equal(joinRepoRelativePath('governance/war', 'hero.png'), '/governance/war/hero.png')
  })
})
