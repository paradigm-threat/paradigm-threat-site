import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('PWA / PopImage hardening markers', () => {
  it('next.config.js keeps surprise-reload flags off', () => {
    const cfg = readFileSync(join(root, 'next.config.js'), 'utf8')
    assert.match(cfg, /reloadOnOnline:\s*false/)
    assert.match(cfg, /cacheOnFrontEndNav:\s*false/)
    assert.match(cfg, /aggressiveFrontEndNavCaching:\s*false/)
    // handler precedes cacheName in the pt-articles rule object
    assert.match(
      cfg,
      /handler:\s*'NetworkFirst'[\s\S]{0,200}cacheName:\s*'pt-articles'/,
    )
  })

  it('OptimizedImage has load timeout + Retry exhausted UI', () => {
    const src = readFileSync(join(root, 'components/Image/OptimizedImage.tsx'), 'utf8')
    assert.match(src, /LOAD_TIMEOUT_MS\s*=\s*12000/)
    assert.match(src, /setLoadFailed\(true\)/)
    assert.match(src, /\bRetry\b/)
    assert.match(src, /Image failed to load from Relay mirrors/)
    assert.match(src, /advanceMirror/)
  })

  it('CatchAllClient does not null loadingPathRef on effect cleanup', () => {
    const src = readFileSync(join(root, 'components/content/CatchAllClient.tsx'), 'utf8')
    assert.doesNotMatch(
      src,
      /return \(\) => \{[^}]*loadingPathRef\.current\s*=\s*null/s,
    )
    assert.match(src, /Do NOT null loadingPathRef/)
    assert.match(src, /prevLoadingPath !== null && prevLoadingPath !== requestPath/)
  })
})
