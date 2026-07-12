import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyContentPath } from './classifyContentPath.ts'

describe('classifyContentPath', () => {
  it('classifies parent-folder reader essays as article', () => {
    assert.equal(
      classifyContentPath('governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.md'),
      'article',
    )
  })

  it('classifies investigations folder dossiers', () => {
    assert.equal(
      classifyContentPath('governance/war/investigations/islamabad-peace-deal-investigation.md'),
      'investigation',
    )
  })

  it('classifies standalone *investigation*.md outside investigations/', () => {
    assert.equal(
      classifyContentPath('science/ai/llm-history-governance-theater-investigation.md'),
      'investigation',
    )
  })

  it('classifies blog/*.md as blog', () => {
    assert.equal(classifyContentPath('blog/2026-03-03-timeline-update.md'), 'blog')
  })

  it('blog prefix wins over investigation basename', () => {
    assert.equal(classifyContentPath('blog/foo-investigation.md'), 'blog')
  })

  it('excludes page.md hubs', () => {
    assert.equal(classifyContentPath('governance/war/investigations/page.md'), 'exclude')
    assert.equal(classifyContentPath('blog/page.md'), 'exclude')
  })

  it('excludes README.md housekeeping files', () => {
    assert.equal(classifyContentPath('README.md'), 'exclude')
    assert.equal(classifyContentPath('science/README.md'), 'exclude')
  })

  it('excludes docs/** and sweep plans', () => {
    assert.equal(classifyContentPath('docs/INVESTIGATION_LLM_SWEEP.md'), 'exclude')
    assert.equal(
      classifyContentPath('docs/sweep-plans/2026-06-23-moor-meme-cluster-sweep-plan.md'),
      'exclude',
    )
  })

  it('excludes non-md, auto.md, and timeline repo paths', () => {
    assert.equal(classifyContentPath('governance/war/foo.png'), 'exclude')
    assert.equal(classifyContentPath('history/foo.auto.md'), 'exclude')
    assert.equal(
      classifyContentPath('timeline/evt-foo.md', 'paradigm-threat-timeline'),
      'exclude',
    )
  })
})
