import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('timeline subdomain default', () => {
  it('middleware rewrites timeline.paradigmthreat.net / to /timeline', () => {
    const src = readFileSync(join(root, 'middleware.ts'), 'utf8')
    assert.match(src, /timeline\.paradigmthreat\.net/)
    assert.match(src, /pathname === '\/'/)
    assert.match(src, /url\.pathname = '\/timeline'/)
    assert.match(src, /NextResponse\.rewrite/)
  })
})
