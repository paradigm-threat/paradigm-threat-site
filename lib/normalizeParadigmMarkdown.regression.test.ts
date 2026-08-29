import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeParadigmMarkdown } from './normalizeParadigmMarkdown.ts'

describe('normalizeParadigmMarkdown', () => {
  it('fixes mis-prefixed heading images', () => {
    const out = normalizeParadigmMarkdown('![## Section title\n\nBody')
    assert.equal(out, '## Section title\n\nBody')
  })

  it('strips popimage-portrait-sibling HTML comments so they cannot leak as text', () => {
    const md = [
      '# Title',
      '',
      '![hero](./hero.png)',
      '',
      '<!-- popimage-portrait-sibling: hero-portrait.png (~1086×1448) — PopImage art-direction -->',
      '',
      '> **TL;DR:** Start here.',
      '',
    ].join('\n')
    const out = normalizeParadigmMarkdown(md)
    assert.doesNotMatch(out, /popimage-portrait-sibling/)
    assert.doesNotMatch(out, /<!--/)
    assert.match(out, /TL;DR/)
    assert.match(out, /!\[hero\]\(\.\/hero\.png\)/)
  })

  it('strips multiline HTML comments', () => {
    const out = normalizeParadigmMarkdown('Before\n<!--\nnote\n-->\nAfter')
    assert.equal(out, 'Before\n\nAfter')
  })
})
