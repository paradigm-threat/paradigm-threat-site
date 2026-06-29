import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildContentItemsFromIndex,
  mergeChangelogImagesIntoItems,
  RECENT_CONTENT_DAYS,
} from './buildContentItemsFromIndex.ts'
import { buildContentItemsFromChangelog } from './buildContentItemsFromChangelog.ts'

const NOW = new Date('2026-06-29T12:00:00.000Z')

describe('buildContentItemsFromIndex', () => {
  const sampleIndex = {
    cosmos: {
      'mars-dagger.md': {
        _title: 'Mars Dagger',
        _updated: '2026-06-28T13:45:12Z',
      },
    },
    events: {
      false_flag: {
        investigations: {
          'richard-gage-ae911truth-controlled-demolition-investigation.md': {
            _updated: '2026-06-28T12:15:46Z',
          },
        },
      },
    },
    blog: {
      '2026-06-01-roundup.md': { _updated: '2026-06-01T12:00:00Z' },
    },
    history: {
      'old-article.md': { _updated: '2026-01-01T12:00:00Z' },
    },
    docs: {
      'internal.md': { _updated: '2026-06-28T12:00:00Z' },
    },
  }

  it('includes items updated within RECENT_CONTENT_DAYS, excludes older and docs/', () => {
    const result = buildContentItemsFromIndex(sampleIndex, { now: NOW, withinDays: RECENT_CONTENT_DAYS })
    assert.equal(result.articles.length, 1)
    assert.equal(result.articles[0].path, 'cosmos/mars-dagger.md')
    assert.equal(result.investigations.length, 1)
    assert.equal(result.blog.length, 1)
    assert.ok(!result.articles.some((a) => a.path === 'history/old-article.md'))
    assert.ok(!result.investigations.some((i) => i.path.startsWith('docs/')))
  })

  it('sorts by _updated descending', () => {
    const index = {
      a: { 'one.md': { _updated: '2026-06-20T12:00:00Z' } },
      b: { 'two.md': { _updated: '2026-06-25T12:00:00Z' } },
    }
    const result = buildContentItemsFromIndex(index, { now: NOW })
    assert.deepEqual(
      result.articles.map((x) => x.path),
      ['b/two.md', 'a/one.md'],
    )
  })

  it('builds hrefs for blog and page.md', () => {
    const index = {
      blog: { '2026-06-01-roundup.md': { _updated: '2026-06-28T12:00:00Z' } },
      governance: { war: { 'page.md': { _updated: '2026-06-28T12:00:00Z' } } },
    }
    const result = buildContentItemsFromIndex(index, { now: NOW })
    const blog = result.blog.find((b) => b.path === 'blog/2026-06-01-roundup.md')
    assert.equal(blog?.href, '/blog/2026-06-01-roundup')
  })
})

describe('mergeChangelogImagesIntoItems', () => {
  it('copies imageSrc from changelog items onto index items by path', () => {
    const fromIndex = buildContentItemsFromIndex(
      { cosmos: { 'mars-dagger.md': { _updated: '2026-06-28T13:45:12Z' } } },
      { now: NOW },
    )
    const fromChangelog = buildContentItemsFromChangelog([
      {
        repo: 'paradigm-threat-files',
        date: '2026-06-28T13:45:12Z',
        message: 'img',
        files: [{ path: 'cosmos/mars-dagger.md', href: '/cosmos/mars-dagger' }],
        images: [{ src: '/cosmos/mars-dagger.png' }],
      },
    ])
    const merged = mergeChangelogImagesIntoItems(fromIndex, fromChangelog)
    assert.equal(merged.articles[0]?.imageSrc, '/cosmos/mars-dagger.png')
  })
})
