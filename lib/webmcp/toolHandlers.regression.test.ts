import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import type { IndexedPathEntry } from '../../components/helpers/indexHelper.ts'
import {
  executeSearchSite,
  executeFindArticlesForText,
  executePrepareIllustrationPrompt,
  executeListSearchFilters,
  executePrepareReplyContext,
  executeListIndexEntries,
  executeFormatReplyCitations,
  executeGetProjectPerspective,
  executeGetSiteClaims,
} from './toolHandlers.ts'
import { setWebMcpSearchIndexOverride } from './indexStore.ts'
import { installSiteClaimsFixture } from '../siteAi/siteClaimsTestFixtures.ts'
import { resetSiteClaimsCache, setSiteClaimsIndexOverride } from '../siteAi/siteClaimsStore.ts'

const mockEntries: IndexedPathEntry[] = [
  { path: 'science/aether.md', searchText: 'science/aether.md Aether plasma magnetism' },
  { path: 'debunk/mud-flood.md', searchText: 'debunk/mud-flood.md Mud Flood Tartaria' },
  { path: 'timeline/evt-test', searchText: 'evt-test Golden mud' },
]

describe('webmcp tool handlers', () => {
  beforeEach(() => {
    setWebMcpSearchIndexOverride(async () => mockEntries)
    installSiteClaimsFixture()
  })

  afterEach(() => {
    setWebMcpSearchIndexOverride(null)
    setSiteClaimsIndexOverride(null)
    resetSiteClaimsCache()
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

  it('search_site accepts array query args', async () => {
    const result = await executeSearchSite({ query: ['aether', 'plasma'], limit: 10 })
    assert.notEqual(result.isError, true)
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { count: number; results: { path: string }[] }
    assert.equal(parsed.results[0]?.path, 'science/aether.md')
  })

  it('get_site_claims requires query or id and keeps author-thesis cards', async () => {
    const missing = await executeGetSiteClaims({})
    assert.equal(missing.isError, true)
    const byId = await executeGetSiteClaims({ id: 'stalin-holodomor-agency' })
    assert.notEqual(byId.isError, true)
    const idText = byId.content[0]?.type === 'text' ? byId.content[0].text : ''
    const idParsed = JSON.parse(idText) as { claims: { id: string; confidence: string }[] }
    assert.equal(idParsed.claims[0]?.id, 'stalin-holodomor-agency')
    assert.equal(idParsed.claims[0]?.confidence, 'author-thesis')
    const byQuery = await executeGetSiteClaims({ query: 'Could Stalin have stopped the Holodomor?' })
    assert.notEqual(byQuery.isError, true)
    const qText = byQuery.content[0]?.type === 'text' ? byQuery.content[0].text : ''
    const qParsed = JSON.parse(qText) as { claims: { id: string }[] }
    assert.ok(qParsed.claims.some((c) => c.id === 'stalin-holodomor-agency'))
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
      projectPerspective: string
      replyDraft?: string
    }
    assert.ok(parsed.seedArticles.length >= 1)
    assert.ok(parsed.agentInstructions.includes('read_article'))
    assert.ok(parsed.projectPerspective.includes('æther'))
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

  it('prepare_illustration_prompt builds CLI from inline markdown', async () => {
    const md = `# Test Article\n\nSubtitle here.\n\n<!-- image-gen:hero\nprompt: buried ring concept art\nmodel: final\n-->\n`
    const result = await executePrepareIllustrationPrompt({
      articlePath: 'science/test/article.md',
      markdown: md,
      slot: 'hero',
    })
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
    const parsed = JSON.parse(text) as { prompt: string; cliCommand: string; outputBasename: string }
    assert.ok(parsed.prompt.includes('buried ring'))
    assert.ok(parsed.cliCommand.includes('generate-illustration.py'))
    assert.ok(parsed.outputBasename.endsWith('article.png'))
    assert.notEqual(result.isError, true)
  })

  it('submit_investigation_idea rejects short description', async () => {
    const { executeSubmitInvestigationIdea } = await import('./toolHandlers.ts')
    const result = await executeSubmitInvestigationIdea({
      topic: 'Valid topic title',
      description: 'too short',
    })
    assert.equal(result.isError, true)
  })
})
