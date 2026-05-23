import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildArticleMdCandidatePaths } from './articleMdPaths.ts'

describe('buildArticleMdCandidatePaths', () => {
  it('root path resolves to page.md', () => {
    assert.deepEqual(buildArticleMdCandidatePaths(''), ['page.md', 'page.mdx'])
    assert.deepEqual(buildArticleMdCandidatePaths('/'), ['page.md', 'page.mdx'])
  })

  it('directory path tries page.md after extensions', () => {
    assert.deepEqual(buildArticleMdCandidatePaths('blog'), [
      'blog.md',
      'blog.mdx',
      'blog/page.md',
      'blog/page.mdx',
    ])
  })

  it('explicit md path is single candidate', () => {
    assert.deepEqual(buildArticleMdCandidatePaths('blog/post.md'), ['blog/post.md'])
  })

  it('does not probe .png paths as .png.md', () => {
    assert.deepEqual(
      buildArticleMdCandidatePaths(
        'history/chronology/napoleon-corpses-dry-egypt-siberian-disease-quote.png',
      ),
      [],
    )
  })
})
