import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveArticleDisplayTitle } from './articleBody.ts'

describe('resolveArticleDisplayTitle', () => {
  it('prefers H1 over parent directory segment for nested articles', () => {
    const md = '# Machine-Readable Web, Wrong Turns, and the AI Gate\n\nBody.'
    const title = resolveArticleDisplayTitle(
      'science/computing/the-internet-that-should-have-been.md',
      md,
    )
    assert.equal(title, 'Machine-Readable Web, Wrong Turns, and the AI Gate')
  })

  it('uses parent directory for page.md index files', () => {
    const md = '# Section overview\n\nIntro.'
    const title = resolveArticleDisplayTitle('science/computing/page.md', md)
    assert.equal(title, 'Section overview')
  })

  it('uses frontmatter title when present', () => {
    const title = resolveArticleDisplayTitle(
      'science/computing/foo.md',
      '# Heading',
      'Frontmatter Title',
    )
    assert.equal(title, 'Frontmatter Title')
  })
})
