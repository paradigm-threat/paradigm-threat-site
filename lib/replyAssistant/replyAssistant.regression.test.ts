import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { findArticlesForText } from './findArticlesForText.ts'
import { composeReplyShell } from './composeReplyShell.ts'
import { formatCitationBlock } from './formatCitations.ts'

const entries: IndexedPathEntry[] = [
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria evidence' },
  { path: 'history/tartaria.md', searchText: 'history/tartaria.md Tartaria maps mud flood' },
  { path: 'blog/noise.md', searchText: 'blog/noise.md unrelated topic' },
]

describe('findArticlesForText', () => {
  it('finds articles for forum paste about mud flood', () => {
    const result = findArticlesForText(entries, {
      sourceText: 'I keep hearing about the mud flood and tartaria maps from skeptics online what do you think?',
      maxArticles: 5,
    })
    assert.ok(result.results.length >= 1)
    assert.ok(result.results.some((r) => r.path.includes('mud-flood') || r.path.includes('tartaria')))
  })

  it('warns on short paste', () => {
    const result = findArticlesForText(entries, { sourceText: 'too short' })
    assert.equal(result.results.length, 0)
    assert.ok(result.warnings.length > 0)
  })
})

describe('composeReplyShell', () => {
  it('omits citations by default', () => {
    const text = composeReplyShell({
      sourceText: 'Someone asked about mud floods in the forum today',
      articles: [{ title: 'Mud Flood', tldr: 'Evidence summary here.' }],
      includeCitations: false,
      citations: [{ title: 'Mud Flood', url: 'https://paradigmthreat.net/debunk/mud-flood' }],
    })
    assert.ok(text.includes('Evidence summary'))
    assert.ok(!text.includes('paradigmthreat.net'))
  })

  it('appends citation footer when enabled', () => {
    const text = composeReplyShell({
      sourceText: 'Forum post about tartaria',
      articles: [{ title: 'Tartaria', tldr: 'Overview.' }],
      includeCitations: true,
      citations: [{ title: 'Tartaria', url: 'https://paradigmthreat.net/history/tartaria' }],
    })
    assert.ok(text.includes('Sources:'))
    assert.ok(text.includes('paradigmthreat.net'))
  })
})

describe('formatCitationBlock', () => {
  it('formats markdown links', () => {
    const block = formatCitationBlock(
      [{ title: 'A', url: 'https://example.com/a' }],
      'markdown'
    )
    assert.match(block, /\[A\]\(https:\/\/example\.com\/a\)/)
  })
})
