import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('app subdomains (timeline + chat)', () => {
  it('redirects / to feature path only from park/apex Home; no permanent rewrite', () => {
    const src = readFileSync(join(root, 'middleware.ts'), 'utf8')
    assert.match(src, /timeline\.paradigmthreat\.net/)
    assert.match(src, /chat\.paradigmthreat\.net/)
    assert.match(src, /refererIsParadigmHome/)
    assert.match(src, /appSubdomainHomeRedirect/)
    assert.match(src, /'\/timeline'/)
    assert.match(src, /'\/chat'/)
    assert.match(src, /NextResponse\.redirect/)
    assert.doesNotMatch(src, /NextResponse\.rewrite\(url\)/)
  })
})
