import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  clearFilesCatalogCache,
  getCachedFilesCatalogTree,
  getCachedFilesIndexedEntries,
  loadFilesCatalogCached,
  rememberFilesCatalogFromEnvelope,
} from './filesCatalogCache.ts'
import type { RelayQueryEnvelope } from './relayQuery.ts'

function env (results: Record<string, unknown>[]): RelayQueryEnvelope {
  return {
    results,
    collection: 'index',
    query: '',
    count: results.length,
    docCount: results.length,
    status: 'ok',
  }
}

describe('filesCatalogCache', () => {
  beforeEach(() => {
    clearFilesCatalogCache()
  })

  it('remembers tree and indexed entries by origin', () => {
    const tree = rememberFilesCatalogFromEnvelope(
      'https://dfw1.example/paradigm-threat-files',
      env([{ path: 'a/b.md', title: 'B', _keywords: '#x' }]),
    )
    assert.ok(tree)
    assert.deepEqual(
      getCachedFilesCatalogTree('https://dfw1.example/paradigm-threat-files/'),
      tree,
    )
    assert.equal(getCachedFilesCatalogTree('https://lon1.example/paradigm-threat-files'), null)
    const entries = getCachedFilesIndexedEntries('https://dfw1.example/paradigm-threat-files')
    assert.ok(entries?.some((e) => e.path === 'a/b.md'))
  })

  it('dedupes concurrent loaders for the same origin', async () => {
    let calls = 0
    const loader = async () => {
      calls += 1
      await new Promise((r) => setTimeout(r, 20))
      return env([{ path: 'only.md', title: 'Only' }])
    }
    const origin = 'https://dfw1.example/paradigm-threat-files'
    const [a, b] = await Promise.all([
      loadFilesCatalogCached(origin, loader),
      loadFilesCatalogCached(origin, loader),
    ])
    assert.equal(calls, 1)
    assert.deepEqual(a, b)
    assert.deepEqual(getCachedFilesCatalogTree(origin), a)
  })

  it('rejects empty envelopes via catalogEnvelopeHasPaths', async () => {
    const { catalogEnvelopeHasPaths } = await import('./filesCatalogCache.ts')
    assert.equal(catalogEnvelopeHasPaths(env([])), false)
    assert.equal(catalogEnvelopeHasPaths({ results: [], docCount: 0, collection: 'index', query: '', count: 0, status: 'ok' }), false)
    assert.equal(catalogEnvelopeHasPaths({ results: [{ title: 'no-path' }], docCount: 0, collection: 'index', query: '', count: 1, status: 'ok' }), false)
    assert.equal(catalogEnvelopeHasPaths(env([{ path: 'a.md' }])), true)
    assert.equal(
      catalogEnvelopeHasPaths({ results: [], docCount: 2339, collection: 'index', query: '', count: 0, status: 'ok' }),
      true,
    )
  })
})
