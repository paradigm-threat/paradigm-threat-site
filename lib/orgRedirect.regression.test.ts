import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('paradigmthreat.org → pure Relay', () => {
  it('permanently redirects .org hosts to paradigmthreat.net', () => {
    const src = readFileSync(join(root, 'next.config.js'), 'utf8')
    assert.match(src, /www\.paradigmthreat\.org/)
    assert.match(src, /['"]paradigmthreat\.org['"]/)
    assert.match(src, /https:\/\/paradigmthreat\.net\/:path\*/)
    assert.match(src, /permanent:\s*true/)
  })
})
