import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

const FILES_BASE = 'https://paradigm-threat-files.iad1.relaygateway.net'
const TIMELINE_BASE = 'https://paradigm-threat-timeline.iad1.relaygateway.net'

describe('buildOptimizedAssetUrl', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL
  const prevTimeline = process.env.NEXT_PUBLIC_TIMELINE_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL = FILES_BASE
    process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = TIMELINE_BASE
  })

  after(() => {
    if (prevFiles === undefined) delete process.env.NEXT_PUBLIC_FILES_BASE_URL
    else process.env.NEXT_PUBLIC_FILES_BASE_URL = prevFiles
    if (prevTimeline === undefined) delete process.env.NEXT_PUBLIC_TIMELINE_BASE_URL
    else process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = prevTimeline
  })

  it('builds relay mirror URL with w for files repo images', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/science/geoengineering/foo.png', 160)
    assert.equal(
      url,
      'https://paradigm-threat-files.iad1.relaygateway.net/science/geoengineering/foo.png?w=160',
    )
    assert.doesNotMatch(url, /\/api\/image/)
  })

  it('uses timeline mirror for media/ paths', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/media/cover.jpg', 400)
    assert.equal(
      url,
      'https://paradigm-threat-timeline.iad1.relaygateway.net/media/cover.jpg?w=400',
    )
  })

  it('returns SVG without w query', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/site/icon.svg')
    assert.equal(url, 'https://paradigm-threat-files.iad1.relaygateway.net/site/icon.svg')
    assert.doesNotMatch(url, /\?w=/)
  })

  it('defaults raster width to 800', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/cosmos/mars/massacre.jpg')
    assert.match(url, /\?w=800$/)
  })

  it('listOptimizedAssetUrls rewrites canonical-site https URLs onto Relay mirrors (not a single http leftover)', async () => {
    const { buildOptimizedAssetUrl, listOptimizedAssetUrls } = await import('./relayOptimizedAssetUrl.ts')
    const abs =
      'https://paradigmthreat.net/influence/controlled_opposition/investigations/cave-story-header.png'
    const expected = buildOptimizedAssetUrl(abs, 800)
    const mirrors = listOptimizedAssetUrls(abs, 800)
    assert.ok(mirrors.length >= 1)
    assert.ok(mirrors.includes(expected))
    for (const u of mirrors) {
      assert.match(u, /\.relaygateway\.net\//)
      assert.match(u, /\?w=800$/)
      assert.doesNotMatch(u, /paradigmthreat\.net/)
    }
  })

  it('normalizes canonical https before the absolute-URL early return so all files mirrors participate', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./relayOptimizedAssetUrl.ts', import.meta.url), 'utf8')
    const fn = src.slice(src.indexOf('export function listOptimizedAssetUrls'))
    const normalizeAt = fn.indexOf('normalizePathForMirror(pathForAPI)')
    const httpGate = fn.indexOf("pathForAPI.startsWith('http')")
    assert.ok(normalizeAt >= 0, 'listOptimizedAssetUrls should normalize first')
    assert.ok(httpGate > normalizeAt, 'http early-return must run after canonical→relative normalize')
  })
})
