import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  eventRowsToIndexedEntries,
  eventsRowsToTimelineData,
  filesRowsToIndexedEntries,
  rebuildFilesIndexTree,
} from './queryCatalog.ts'

describe('queryCatalog', () => {
  it('rebuildFilesIndexTree sets _count', () => {
    const tree = rebuildFilesIndexTree([
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

  it('maps rows to IndexedPathEntry', () => {
    const files = filesRowsToIndexedEntries([{ path: 'a.md', _title: 'A', _keywords: ['k'] }])
    assert.equal(files[0]?.path, 'a.md')
    assert.match(files[0]!.searchText, /A/)
    const ev = eventRowsToIndexedEntries([{ id: 'evt-1', title: 'T', md_path: 'c.md', keywords: ['x'] }])
    assert.equal(ev[0]?.path, 'timeline/evt-1')
  })
})
