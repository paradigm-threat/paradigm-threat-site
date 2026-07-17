import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  eventRowsToIndexedEntries,
  eventsRowsToTimelineData,
  filesRowsToIndexedEntries,
  rebuildFilesCatalogTree,
} from './queryCatalog.ts'

describe('queryCatalog', () => {
  it('rebuildFilesCatalogTree sets _count', () => {
    const tree = rebuildFilesCatalogTree([
      { path: 'blog/a.md', _title: 'A' },
      { path: 'blog/b.md', _title: 'B' },
      { path: 'cosmos/venus/page.md', title: 'Venus' },
    ])
    assert.equal((tree.blog as { _count: number })._count, 2)
    assert.equal((tree.cosmos as { _count: number })._count, 1)
    assert.equal(((tree.cosmos as Record<string, unknown>).venus as { _count: number })._count, 1)
  })

  it('eventsRowsToTimelineData picks roots', () => {
    const data = eventsRowsToTimelineData([
      {
        id: 'evt-root',
        title: 'Root',
        md_path: 'content/00.overview/00.00.00-introduction.md',
        children: [{ id: 'evt-child', title: 'Child', md_path: 'x.md', children: [] }],
      },
      {
        id: 'evt-child',
        title: 'Child',
        md_path: 'x.md',
        children: [],
      },
      {
        id: '__introArticles__',
        type: 'manifest',
        introArticles: [{ id: 'evt-root', title: 'Root', md_path: 'content/00.overview/00.00.00-introduction.md' }],
      },
    ])
    assert.equal(data.entries?.length, 1)
    assert.equal(data.entries?.[0]?.id, 'evt-root')
    assert.equal(data.introArticles?.length, 1)
  })

  it('restores source order for shuffled timeline rows and children', () => {
    const data = eventsRowsToTimelineData([
      {
        id: 'evt-1053-ce-11th-century-ce-common-era-begins',
        title: '11th Century',
        md_path: 'content/05.ce-11th-common-era-begins/05.00.00-11th-century.md',
        children: [
          { id: 'evt-11-b', title: 'B', md_path: 'content/05.ce-11th-common-era-begins/05.02.00-b.md', children: [] },
          { id: 'evt-11-a', title: 'A', md_path: 'content/05.ce-11th-common-era-begins/05.01.00-a.md', children: [] },
        ],
      },
      {
        id: 'evt-3147-bce-the-dark-ages',
        title: 'The Dark Ages',
        md_path: 'content/03.the-dark-ages/03.00.00-the-dark-ages.md',
        children: [],
      },
      {
        id: 'evt-4077-bce-the-golden-age',
        title: 'The Golden Age',
        md_path: 'content/02.the-golden-age/02.00.00-the-golden-age.md',
        children: [],
      },
    ])

    assert.deepEqual(data.entries?.map((entry) => entry.id), [
      'evt-4077-bce-the-golden-age',
      'evt-3147-bce-the-dark-ages',
      'evt-1053-ce-11th-century-ce-common-era-begins',
    ])
    assert.deepEqual(data.entries?.[2]?.children.map((entry) => entry.id), ['evt-11-a', 'evt-11-b'])
  })

  it('maps rows to IndexedPathEntry', () => {
    const files = filesRowsToIndexedEntries([{ path: 'a.md', _title: 'A', _keywords: ['k'] }])
    assert.equal(files[0]?.path, 'a.md')
    assert.match(files[0]!.searchText, /A/)
    const ev = eventRowsToIndexedEntries([{ id: 'evt-1', title: 'T', md_path: 'c.md', keywords: ['x'] }])
    assert.equal(ev[0]?.path, 'timeline/evt-1')
  })
})
