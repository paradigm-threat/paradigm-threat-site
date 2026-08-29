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
    assert.match(cfg, /handler:\s*'NetworkOnly'/)
    assert.match(cfg, /va\\.vercel-scripts\\.com/)
    assert.match(cfg, /vitals\\.vercel-insights\\.com/)
  })

  it('OptimizedImage has load timeout + Retry exhausted UI', () => {
    const src = readFileSync(join(root, 'components/Image/OptimizedImage.tsx'), 'utf8')
    assert.match(src, /LOAD_TIMEOUT_MS\s*=\s*4000/)
    assert.match(src, /loading=\{priority \? 'eager' : 'lazy'\}/)
    assert.match(src, /fetchPriority=\{priority \? 'high' : undefined\}/)
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
    assert.match(src, /without waiting on full-catalog QUERY/)
    assert.match(src, /CatchAllPageSkeleton/)
    assert.doesNotMatch(src, /min-h-screen/)
  })

  it('relay probes fail dead mirrors in 2s and race first healthy pair', () => {
    const src = readFileSync(join(root, 'lib/remoteRelayStore.ts'), 'utf8')
    assert.match(src, /PROBE_TIMEOUT_MS = 2000/)
    assert.match(src, /PROBE_SECONDARY_DELAY_MS/)
    assert.match(src, /First healthy/)
    assert.match(src, /RELAY_LAST_GOOD_PAIR_KEY/)
    assert.match(src, /probeAbort/)
    assert.match(src, /void this\.bootstrap\(\)/)
    assert.doesNotMatch(src, /await this\.bootstrap\(\)/)
  })

  it('navbar wordmark reserves size and is high priority', () => {
    const src = readFileSync(join(root, 'components/Navbar/Navbar.tsx'), 'utf8')
    assert.match(src, /width=\{1146\}/)
    assert.match(src, /height=\{163\}/)
    assert.match(src, /fetchPriority="high"/)
  })

  it('Titillium is self-hosted, not Google Fonts CSS', () => {
    const src = readFileSync(join(root, 'app/site/globals.scss'), 'utf8')
    assert.doesNotMatch(src, /fonts\.googleapis\.com/)
    assert.match(src, /TitilliumWeb-Regular\.woff2/)
    assert.match(src, /TitilliumWeb-Italic\.woff2/)
    assert.match(src, /TitilliumWeb-Bold\.woff2/)
    assert.match(src, /EBGaramond-latin\.woff2/)
    assert.doesNotMatch(src, /EBGaramond-Variable\.ttf/)
  })

  it('CatchAllPageSkeleton reserves article-shell height for CLS', () => {
    const src = readFileSync(join(root, 'components/content/CatchAllPageSkeleton.tsx'), 'utf8')
    assert.match(src, /article-shell-reserve/)
    assert.doesNotMatch(src, /className="[^"]*min-h-screen/)
    const css = readFileSync(join(root, 'app/site/globals.scss'), 'utf8')
    assert.match(css, /\.article-shell-reserve/)
  })

  it('root layout is a Server Component with font preloads', () => {
    const src = readFileSync(join(root, 'app/layout.tsx'), 'utf8')
    assert.doesNotMatch(src, /^['"]use client['"]/m)
    assert.match(src, /RootProviders/)
    assert.match(src, /TitilliumWeb-Regular\.woff2/)
    assert.match(src, /EBGaramond-latin\.woff2/)
    assert.doesNotMatch(src, /NEXT_PUBLIC_SERVER_RELAY_FETCH\s*=/)
  })

  it('PopImage wraps chrome in aside for Reading Mode exclusion', () => {
    const src = readFileSync(join(root, 'components/Image/PopImage.tsx'), 'utf8')
    assert.match(src, /<aside[\s\S]*data-pt-popimage="true"/)
    assert.match(src, /normalizeParadigmMarkdown|Reading Mode/)
  })

  it('normalizeParadigmMarkdown strips HTML comments before md2ast', () => {
    const src = readFileSync(join(root, 'lib/normalizeParadigmMarkdown.ts'), 'utf8')
    assert.match(src, /<!--\[\\s\\S\]\*\?-->/)
    assert.match(src, /popimage-portrait-sibling/)
  })
})
