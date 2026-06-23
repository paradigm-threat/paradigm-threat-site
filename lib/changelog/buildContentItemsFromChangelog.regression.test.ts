import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildContentItemsFromChangelog } from './buildContentItemsFromChangelog.ts'

describe('buildContentItemsFromChangelog', () => {
  it('dedupes by path keeping newest date and matches hero image by slug', () => {
    const result = buildContentItemsFromChangelog([
      {
        repo: 'paradigm-threat-files',
        date: '2026-06-20T10:00:00.000Z',
        message: 'older',
        files: [
          {
            path: 'governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.md',
            href: '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026',
          },
        ],
        images: [],
      },
      {
        repo: 'paradigm-threat-files',
        date: '2026-06-23T15:15:38.000Z',
        message: 'newer',
        files: [
          {
            path: 'governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.md',
            href: '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026',
          },
          {
            path: 'governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.png',
            href: '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.png',
          },
        ],
        images: [
          { src: '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.png' },
        ],
      },
    ])

    assert.equal(result.articles.length, 1)
    assert.equal(result.articles[0].date, '2026-06-23T15:15:38.000Z')
    assert.equal(
      result.articles[0].imageSrc,
      '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.png',
    )
  })

  it('splits articles, investigations, and blog; ignores timeline repo', () => {
    const result = buildContentItemsFromChangelog([
      {
        repo: 'paradigm-threat-files',
        date: '2026-06-23T12:00:00.000Z',
        message: 'mixed',
        files: [
          {
            path: 'governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026.md',
            href: '/governance/war/islamabad-peace-deal-the-war-nobody-cares-about-2026',
          },
          {
            path: 'governance/war/investigations/islamabad-peace-deal-investigation.md',
            href: '/governance/war/investigations/islamabad-peace-deal-investigation',
          },
          {
            path: 'blog/2026-03-03-timeline-update.md',
            href: '/blog/2026-03-03-timeline-update',
          },
        ],
        images: [],
      },
      {
        repo: 'paradigm-threat-timeline',
        date: '2026-06-23T13:00:00.000Z',
        message: 'timeline only',
        files: [
          { path: 'timeline/evt-foo.md', href: '/timeline/evt-foo' },
        ],
        images: [],
      },
    ])

    assert.equal(result.articles.length, 1)
    assert.equal(result.investigations.length, 1)
    assert.equal(result.blog.length, 1)
  })
})
