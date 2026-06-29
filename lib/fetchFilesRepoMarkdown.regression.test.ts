import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { fetchFilesRepoMarkdown } from './fetchFilesRepoMarkdown.ts'

const NOT_FOUND_JSON = JSON.stringify({
  ok: false,
  status: 'not_found',
  path: 'blog.md',
})

const PAGE_MD = '# Blog\n\n<AutoIndex />'

describe('fetchFilesRepoMarkdown', () => {
  it('skips relay not_found JSON and tries page.md', async () => {
    const fetchMock = mock.fn(async (url: string) => {
      if (url.endsWith('/blog.md')) {
        return { ok: true, text: async () => NOT_FOUND_JSON }
      }
      if (url.endsWith('/blog/page.md')) {
        return { ok: true, text: async () => PAGE_MD }
      }
      return { ok: false, text: async () => '' }
    })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as typeof fetch

    const result = await fetchFilesRepoMarkdown('blog', 'https://files.example')

    globalThis.fetch = originalFetch

    assert.deepEqual(result, { text: PAGE_MD, relPath: 'blog/page.md' })
    assert.equal(fetchMock.mock.calls.length, 3)
    assert.match(String(fetchMock.mock.calls[0]?.arguments[0]), /blog\.md$/)
    assert.match(String(fetchMock.mock.calls[1]?.arguments[0]), /blog\.mdx$/)
    assert.match(String(fetchMock.mock.calls[2]?.arguments[0]), /blog\/page\.md$/)
  })
})
