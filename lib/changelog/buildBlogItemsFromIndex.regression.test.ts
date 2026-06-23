import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildBlogItemsFromIndex, mergeBlogTabItems } from './buildBlogItemsFromIndex.ts'

describe('buildBlogItemsFromIndex', () => {
  it('lists blog/*.md from index node', () => {
    const items = buildBlogItemsFromIndex({
      _count: 2,
      '2026-03-01-timeline-update.md': { _updated: '2026-03-01T12:00:00Z' },
      'page.md': { _updated: '2026-01-01T00:00:00Z' },
      '2026-02-28-timeline-update.md': { _updated: '2026-02-28T12:00:00Z' },
    })

    assert.equal(items.length, 2)
    assert.equal(items[0].path, 'blog/2026-03-01-timeline-update.md')
    assert.equal(items[0].href, '/blog/2026-03-01-timeline-update')
  })

  it('mergeBlogTabItems overlays changelog date and image onto index rows', () => {
    const fromIndex = buildBlogItemsFromIndex({
      'post-a.md': { _updated: '2026-01-01T00:00:00Z' },
      'post-b.md': { _updated: '2026-02-01T00:00:00Z' },
    })

    const merged = mergeBlogTabItems(fromIndex, [
      {
        path: 'blog/post-a.md',
        href: '/blog/post-a',
        date: '2026-06-01T00:00:00Z',
        repo: 'paradigm-threat-files',
        imageSrc: '/blog/post-a.png',
        kind: 'blog',
      },
    ])

    assert.equal(merged.length, 2)
    const a = merged.find((x) => x.path === 'blog/post-a.md')
    assert.equal(a?.date, '2026-06-01T00:00:00Z')
    assert.equal(a?.imageSrc, '/blog/post-a.png')
  })
})
