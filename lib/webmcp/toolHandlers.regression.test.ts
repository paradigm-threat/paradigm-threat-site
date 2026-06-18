import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '../../components/helpers/indexHelper.ts'
import {
  executeSearchSite,
  executeFindArticlesForText,
  executeListSearchFilters,
  executePrepareReplyContext,
  executeListIndexEntries,
  executeFormatReplyCitations,
  executeGetProjectPerspective,
} from './toolHandlers.ts'
import { setWebMcpSearchIndexOverride } from './indexStore.ts'

const mockEntries: IndexedPathEntry[] = [
  { path: 'science/aether.md', searchText: 'science/aether.md Aether plasma magnetism' },
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria' },
  { path: 'timeline/evt-test', searchText: 'evt-test Golden mud' },
]

describe('webmcp tool handlers', () => {
  beforeEach(() => {
    setWebMcpSearchIndexOverride(async () => mockEntries)
  })

  afterEach(() => {
    setWebMcpSearchIndexOverride(null)
  })

  it('search_site uses AND semantics', async () => {
    const result = await executeSearchSite({ query: 'aether plasma', limit: 10 })
    assert.notEqual(result.isError, true)
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { count: number; results: { path: string }[] }
    assert.equal(parsed.count, 1)
    assert.equal(parsed.results[0]?.path, 'science/aether.md')
  })

  it('search_site errors on short query', async () => {
    const result = await executeSearchSite({ query: 'a' })
    assert.equal(result.isError, true)
  })

  it('list_search_filters returns defaults', () => {
    const result = executeListSearchFilters()
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { filters: { includeBlog: boolean } }
    assert.equal(parsed.filters.includeBlog, false)
  })

  it('find_articles_for_text returns ranked paths', async () => {
    const result = await executeFindArticlesForText({
      sourceText: 'What do you think about the mud flood and tartaria evidence in this thread?',
    })
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { results: { path: string }[] }
    assert.ok(parsed.results.length >= 1)
  })

  it('prepare_reply_context returns seeds without replyDraft', async () => {
    const result = await executePrepareReplyContext({
      sourceText: 'Tell me about mud flood and tartaria in this forum thread please',
    })
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as {
      seedArticles: { path: string }[]
      agentInstructions: string
      replyDraft?: string
    }
    assert.ok(parsed.seedArticles.length >= 1)
    assert.ok(parsed.agentInstructions.includes('read_article'))
    assert.equal(parsed.replyDraft, undefined)
  })

  it('list_index_entries filters by kind', async () => {
    const result = await executeListIndexEntries({ kind: 'timeline', limit: 10 })
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { entries: { path: string }[] }
    assert.equal(parsed.entries.length, 1)
    assert.ok(parsed.entries[0]?.path.startsWith('timeline/'))
  })

  it('format_reply_citations builds footer', () => {
    const result = executeFormatReplyCitations({
      articles: [{ title: 'Aether', url: 'https://example.com/aether' }],
      citationStyle: 'footer',
    })
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { text: string }
    assert.ok(parsed.text.includes('Sources:'))
    assert.ok(parsed.text.includes('example.com/aether'))
  })

  it('get_project_perspective returns worldview seed', () => {
    const result = executeGetProjectPerspective()
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { perspective: string }
    assert.ok(parsed.perspective.includes('æther'))
    assert.ok(parsed.perspective.includes('Tartaria'))
  })
})
