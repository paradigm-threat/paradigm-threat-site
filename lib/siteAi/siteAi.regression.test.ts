import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { buildSiteChatSystemPrompt } from './buildSiteChatSystemPrompt.ts'
import { formatQuestionContextForPrompt, prepareQuestionContext } from './prepareQuestionContext.ts'
import {
  appendSiteAiMessages,
  clearSiteAiSession,
  loadSiteAiSession,
  SITE_AI_SESSION_STORAGE_KEY,
  type SiteAiStoredMessage,
} from './siteAiSessionStorage.ts'
import { parseToolCall, TOOL_CALL_END, TOOL_CALL_START } from './siteAiToolBridge.ts'
import { setWebMcpSearchIndexOverride } from '../webmcp/indexStore.ts'

const entries: IndexedPathEntry[] = [
  { path: 'history/common-questions.md', searchText: 'history/common-questions.md common questions mud flood' },
  { path: 'history/chronology/history-qa/page.md', searchText: 'history-qa chronology questions tartaria' },
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria evidence' },
  { path: 'history/tartaria.md', searchText: 'history/tartaria.md Tartaria maps mud flood' },
]

describe('buildSiteChatSystemPrompt', () => {
  it('mentions Q&A workflow and tools', () => {
    const prompt = buildSiteChatSystemPrompt()
    assert.ok(prompt.includes('list_index_entries'))
    assert.ok(prompt.includes('site claim'))
    assert.ok(prompt.includes('Current page'))
    assert.ok(prompt.includes(TOOL_CALL_START))
    assert.ok(prompt.includes('æther'))
  })
})

describe('prepareQuestionContext', () => {
  afterEach(() => {
    setWebMcpSearchIndexOverride(null)
  })

  it('prefers Q&A paths for common question topics', async () => {
    setWebMcpSearchIndexOverride(async () => entries)
    const result = await prepareQuestionContext('What does the site say about mud flood and tartaria?')
    assert.ok(result.qaCandidates.length >= 1 || result.generalCandidates.length >= 1)
    const combined = [...result.qaCandidates, ...result.generalCandidates]
    assert.ok(combined.some((h) => h.path.includes('mud-flood') || h.path.includes('tartaria')))
    assert.ok(result.agentInstructions.length > 0)
    assert.ok(Array.isArray(result.matchedClaims))
  })

  it('formats seed JSON for prompts', async () => {
    setWebMcpSearchIndexOverride(async () => entries)
    const result = await prepareQuestionContext('Tell me about tartaria maps')
    const formatted = formatQuestionContextForPrompt(result)
    assert.ok(formatted.includes('question'))
  })

  it('boosts current page path when page context is provided', async () => {
    setWebMcpSearchIndexOverride(async () => entries)
    const result = await prepareQuestionContext('Summarize this page for me', {
      path: 'history/tartaria.md',
      title: 'Tartaria',
      excerpt: 'Maps and empire.',
    })
    assert.equal(result.qaCandidates[0]?.path, 'history/tartaria.md')
    assert.equal(result.qaCandidates[0]?.kind, 'page')
    assert.ok(result.agentInstructions.includes('read_article'))
  })
})

describe('siteAiSessionStorage', () => {
  const store = new Map<string, string>()

  afterEach(() => {
    store.clear()
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('persists and loads messages', () => {
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    }
    ;(globalThis as { localStorage: Storage }).localStorage = mockStorage as Storage

    const msgs: SiteAiStoredMessage[] = [
      { id: '1', role: 'user', content: 'Hello', createdAt: 1 },
      { id: '2', role: 'assistant', content: 'Hi there', createdAt: 2 },
    ]
    appendSiteAiMessages([], msgs)
    const loaded = loadSiteAiSession()
    assert.equal(loaded.length, 2)
    assert.equal(loaded[0]?.content, 'Hello')
    clearSiteAiSession()
    assert.equal(loadSiteAiSession().length, 0)
    assert.equal(store.has(SITE_AI_SESSION_STORAGE_KEY), false)
  })
})

describe('parseToolCall siteAi', () => {
  it('parses allowed tools', () => {
    const call = parseToolCall(`${TOOL_CALL_START}\n{"name":"search_site","arguments":{"query":"aether"}}\n${TOOL_CALL_END}`)
    assert.equal(call?.name, 'search_site')
  })
})

describe('agentProgress', () => {
  it('formats read_article detail with path', async () => {
    const { formatToolProgressDetail, applyProgressEvent } = await import('./agentProgress.ts')
    const detail = formatToolProgressDetail('read_article', { path: 'history/common-questions.md' })
    assert.ok(detail.includes('common-questions'))
    const { steps, current } = applyProgressEvent([], {
      phase: 'tool',
      toolName: 'read_article',
      status: 'start',
      args: { path: 'history/common-questions.md' },
      detail,
    })
    assert.equal(steps.length, 1)
    assert.equal(current, detail)
  })

  it('updates a single active fetch line in place', async () => {
    const { applyProgressEvent, formatFetchProgressDetail } = await import('./agentProgress.ts')
    const first = applyProgressEvent([], {
      phase: 'fetch',
      path: 'search-index/index.json',
      status: 'start',
      detail: formatFetchProgressDetail('search-index/index.json', 'start'),
    })
    assert.equal(first.steps.length, 1)
    assert.equal(first.steps[0]?.status, 'active')

    const second = applyProgressEvent(first.steps, {
      phase: 'fetch',
      path: 'history/mudflood/page.md',
      status: 'start',
      detail: formatFetchProgressDetail('history/mudflood/page.md', 'start'),
    })
    assert.equal(second.steps.length, 1)
    assert.ok(second.steps[0]?.label.includes('mudflood'))

    const done = applyProgressEvent(second.steps, {
      phase: 'fetch',
      path: 'history/mudflood/page.md',
      status: 'done',
      detail: formatFetchProgressDetail('history/mudflood/page.md', 'done'),
    })
    assert.equal(done.steps[0]?.status, 'done')
    assert.ok(done.steps[0]?.label.startsWith('Fetched'))
  })
})
