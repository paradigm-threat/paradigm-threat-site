import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pathSegmentsFromPathname, repoPathFromPathname } from './pathFromPathname.ts'

describe('pathFromPathname', () => {
  it('normalizes leading slash', () => {
    assert.deepEqual(pathSegmentsFromPathname('/blog/'), ['blog'])
    assert.equal(repoPathFromPathname('/blog/'), 'blog')
  })
})
