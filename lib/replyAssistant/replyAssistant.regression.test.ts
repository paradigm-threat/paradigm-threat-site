import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { findArticlesForText } from './findArticlesForText.ts'
import { composeReplyShell } from './composeReplyShell.ts'
import { formatCitationBlock } from './formatCitations.ts'
import { prepareReplyContext } from './prepareReplyContext.ts'
import { listIndexEntries } from './listIndexEntries.ts'
import { readArticleContentFromMarkdown, clampReadArticleMaxChars } from './readArticleContent.ts'
import { buildReplyAgentPrompt, buildReplySystemPrompt } from './agentPrompt.ts'
import { parseToolCall, stripToolMarkers, TOOL_CALL_END, TOOL_CALL_START } from '../siteAi/siteAiToolBridge.ts'

const entries: IndexedPathEntry[] = [
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria evidence' },
  { path: 'history/tartaria.md', searchText: 'history/tartaria.md Tartaria maps mud flood' },
  { path: 'timeline/evt-golden', searchText: 'evt-golden Golden Age aether' },
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

describe('prepareReplyContext', () => {
  it('returns index seeds without fetching markdown', () => {
    const result = prepareReplyContext(entries, {
      sourceText: 'What about the mud flood and tartaria evidence in this thread?',
      includeCitations: false,
    })
    assert.ok(result.seedArticles.length >= 1)
    assert.ok(result.agentInstructions.includes('read_article'))
    assert.ok(result.projectPerspective.includes('æther'))
    assert.ok(result.projectPerspective.includes('Tartaria'))
    assert.equal(result.includeCitations, false)
    assert.ok(!('replyDraft' in result))
  })

  it('warns on short paste', () => {
    const result = prepareReplyContext(entries, { sourceText: 'short' })
    assert.equal(result.seedArticles.length, 0)
    assert.ok(result.warnings.length > 0)
  })

  it('passes user instructions into agent workflow', () => {
    const result = prepareReplyContext(entries, {
      sourceText: 'What about the mud flood and tartaria evidence in this thread?',
      userInstructions: 'Emphasize chronology revision, not generic skeptic debunking.',
    })
    assert.ok(result.agentInstructions.includes('Emphasize chronology revision'))
    assert.equal(result.userInstructions, 'Emphasize chronology revision, not generic skeptic debunking.')
  })
})

describe('listIndexEntries', () => {
  it('filters by prefix and kind', () => {
    const result = listIndexEntries(entries, { prefix: 'debunk/', kind: 'article', limit: 10 })
    assert.equal(result.count, 1)
    assert.equal(result.entries[0]?.path, 'debunk/mud-flood.md')
  })

  it('lists timeline entries', () => {
    const result = listIndexEntries(entries, { kind: 'timeline', limit: 10 })
    assert.equal(result.count, 1)
    assert.ok(result.entries[0]?.path.startsWith('timeline/'))
  })
})

describe('readArticleContentFromMarkdown', () => {
  const bodyRepeat = 'Detail sentence about mud flood evidence. '
  const md = `---
title: Test
---

# Test Article

> **TL;DR:** Summary line here.

${bodyRepeat.repeat(40)}`

  it('returns tldr and paginated body', () => {
    const result = readArticleContentFromMarkdown('debunk/test.md', md, { maxChars: 500 })
    assert.ok(result.tldr.includes('Summary'))
    assert.equal(result.bodyPlain.length, 500)
    assert.equal(result.truncated, true)
    assert.ok(result.canonicalUrl.includes('debunk/test'))
  })

  it('clamps max chars', () => {
    assert.equal(clampReadArticleMaxChars(100), 500)
    assert.equal(clampReadArticleMaxChars(99_999), 50_000)
  })
})

describe('buildReplySystemPrompt', () => {
  it('mentions Q&A paths and investigation tools', () => {
    const prompt = buildReplySystemPrompt({
      includeCitations: false,
      tone: 'neutral',
    })
    assert.ok(prompt.includes('list_index_entries'))
    assert.ok(prompt.includes('history-qa'))
    assert.ok(prompt.includes(TOOL_CALL_START))
    assert.ok(prompt.includes('æther'))
  })

  it('includes optional user reply instructions', () => {
    const prompt = buildReplySystemPrompt({
      includeCitations: false,
      tone: 'brief',
      instructions: 'Lead with giants/MFEE thesis; stay under 3 paragraphs.',
    })
    assert.ok(prompt.includes('User reply instructions'))
    assert.ok(prompt.includes('Lead with giants/MFEE thesis'))
  })
})

describe('parseToolCall', () => {
  it('parses marked tool JSON', () => {
    const block = [
      TOOL_CALL_START,
      '{"name":"search_site","arguments":{"query":"mud flood"}}',
      TOOL_CALL_END,
    ].join('\n')
    const call = parseToolCall(block)
    assert.equal(call?.name, 'search_site')
    assert.equal(call?.arguments.query, 'mud flood')
  })

  it('rejects disallowed tools', () => {
    const call = parseToolCall('{"name":"copy_to_clipboard","arguments":{"text":"x"}}')
    assert.equal(call, null)
  })
})

describe('stripToolMarkers', () => {
  it('removes tool blocks from mixed output', () => {
    const text = `Hello\n${TOOL_CALL_START}\n{}\n${TOOL_CALL_END}\nWorld`
    assert.equal(stripToolMarkers(text), 'Hello\n\nWorld')
  })
})

describe('buildReplyAgentPrompt', () => {
  it('mentions tools and pasted text', () => {
    const prompt = buildReplyAgentPrompt({
      sourceText: 'Forum post about mud floods and tartaria',
      includeCitations: true,
      tone: 'brief',
    })
    assert.ok(prompt.includes('read_article'))
    assert.ok(prompt.includes('Forum post about mud floods'))
    assert.ok(prompt.includes('Sources footer'))
    assert.ok(prompt.includes('æther'))
    assert.ok(prompt.includes('Paradigm Threat'))
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
