import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { IndexedPathEntry } from '../components/helpers/indexHelper.ts'
import { parentDirectoryFromContentPath, indexedFilesDirectlyUnderDirectory } from './indexSiblingEntries.ts'

describe('parentDirectoryFromContentPath', () => {
  it('returns parent for nested slug', () => {
    assert.equal(
      parentDirectoryFromContentPath('science/biology/investigations/german-new-medicine-learninggnm-debunk'),
      'science/biology/investigations'
    )
  })

  it('strips md extension before taking parent', () => {
    assert.equal(parentDirectoryFromContentPath('science/biology/foo.md'), 'science/biology')
  })

  it('returns empty for single-segment path', () => {
    assert.equal(parentDirectoryFromContentPath('README.md'), '')
  })
})

describe('indexedFilesDirectlyUnderDirectory', () => {
  const entries: IndexedPathEntry[] = [
    { path: 'science/biology/investigations/gnm.md', searchText: 'x' },
    { path: 'science/biology/investigations', searchText: 'science/biology/investigations' },
    { path: 'science/biology/investigations/deep/other.md', searchText: 'y' },
    { path: 'timeline/abc', searchText: 'z' },
    { path: 'science/biology/investigations/nested/.auto.md', searchText: 'a' },
  ]

  it('lists only direct file children', () => {
    const got = indexedFilesDirectlyUnderDirectory(entries, 'science/biology/investigations')
    assert.equal(got.length, 1)
    assert.equal(got[0].path, 'science/biology/investigations/gnm.md')
  })
})
