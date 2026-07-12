import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildContentItemsFromIndex,
  RECENT_CONTENT_DAYS,
} from './buildContentItemsFromIndex.ts'
import { buildRecentContentFromRows } from './queryRecentContent.ts'

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

  it('sorts by original publish date when present, else _updated', () => {
    const index = {
      a: {
        'old-publish.md': {
          _updated: '2026-06-25T12:00:00Z',
          _originalPublishedAt: '2026-01-01T12:00:00Z',
        },
      },
      b: { 'newer-update.md': { _updated: '2026-06-28T12:00:00Z' } },
    }
    const result = buildContentItemsFromIndex(index, { now: NOW })
    assert.deepEqual(
      result.articles.map((x) => x.path),
      ['b/newer-update.md', 'a/old-publish.md'],
    )
    const published = result.articles.find((x) => x.path === 'a/old-publish.md')
    assert.equal(published?.originalPublishedAt, '2026-01-01T12:00:00Z')
    assert.equal(published?.updatedAt, '2026-06-25T12:00:00Z')
    assert.equal(published?.date, '2026-01-01T12:00:00Z')
  })

  it('sorts by _updated descending when no original publish date', () => {
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

describe('buildRecentContentFromRows', () => {
  it('buckets flat QUERY rows by content_kind and attaches slug-matched images', () => {
    const result = buildRecentContentFromRows([
      {
        path: 'cosmos/mars-dagger.md',
        title: 'Mars Dagger',
        content_kind: 'article',
        _updated: '2026-06-28T13:45:12Z',
      },
      {
        path: 'events/false_flag/investigations/richard-gage-investigation.md',
        title: 'Richard Gage',
        content_kind: 'investigation',
        _updated: '2026-06-28T12:15:46Z',
      },
      {
        path: 'blog/2026-06-01-roundup.md',
        title: 'Roundup',
        content_kind: 'blog',
        _updated: '2026-06-27T12:00:00Z',
        _originalPublishedAt: '2026-06-01T12:00:00Z',
      },
      { path: 'cosmos/mars-dagger.png', content_kind: 'exclude', title: 'mars' },
      { path: 'history/old-article.md', content_kind: 'article', _updated: '2026-01-01T12:00:00Z' },
      { path: 'README.md', content_kind: 'article', _updated: '2026-06-28T12:00:00Z', title: 'README' },
    ], { now: NOW, withinDays: RECENT_CONTENT_DAYS })

    assert.deepEqual(result.contentByTab.articles.map((x) => x.path), ['cosmos/mars-dagger.md'])
    assert.equal(result.contentByTab.articles[0]?.imageSrc, '/cosmos/mars-dagger.png')
    assert.equal(result.contentByTab.articles[0]?.title, 'Mars Dagger')
    assert.equal(result.contentByTab.investigations.length, 1)
    assert.equal(result.contentByTab.blog[0]?.originalPublishedAt, '2026-06-01T12:00:00Z')
    assert.ok(!result.contentByTab.articles.some((a) => a.path === 'README.md'))
    assert.deepEqual(
      result.feed.map((x) => x.files[0]?.path),
      [
        'cosmos/mars-dagger.md',
        'events/false_flag/investigations/richard-gage-investigation.md',
        'blog/2026-06-01-roundup.md',
      ],
    )
  })

  it('prefers same-directory hero images over basename collisions', () => {
    const result = buildRecentContentFromRows([
      {
        path: 'cosmos/mars.md',
        title: 'Mars',
        content_kind: 'article',
        _updated: '2026-06-28T13:45:12Z',
      },
      { path: 'other/mars.png', content_kind: 'exclude' },
      { path: 'cosmos/mars.png', content_kind: 'exclude' },
    ], { now: NOW, withinDays: RECENT_CONTENT_DAYS })

    assert.equal(result.contentByTab.articles[0]?.imageSrc, '/cosmos/mars.png')
  })
})
