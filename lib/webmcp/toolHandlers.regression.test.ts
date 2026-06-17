import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '../../components/helpers/indexHelper.ts'
import {
  executeSearchSite,
  executeFindArticlesForText,
  executeListSearchFilters,
} from './toolHandlers.ts'
import { setWebMcpSearchIndexOverride } from './indexStore.ts'

const mockEntries: IndexedPathEntry[] = [
  { path: 'science/aether.md', searchText: 'science/aether.md Aether plasma magnetism' },
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria' },
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
})
