import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('bustRelayClientCaches', () => {
  it('exports bust + reload and ShareCopyModal wires a hidden bust link', () => {
    const util = readFileSync(join(root, 'lib/bustRelayClientCaches.ts'), 'utf8')
    assert.match(util, /clearFilesCatalogCache/)
    assert.match(util, /clearMergedSearchIndexCache/)
    assert.match(util, /bustRelayClientCachesAndReload/)

    const modal = readFileSync(
      join(root, 'components/ShareLinks/ShareCopyModal.tsx'),
      'utf8',
    )
    assert.match(modal, /#bust-relay-cache/)
    assert.match(modal, /bustRelayClientCachesAndReload/)
  })
})
