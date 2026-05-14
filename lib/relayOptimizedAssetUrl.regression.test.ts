import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('buildOptimizedAssetUrl', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL
  const prevTimeline = process.env.NEXT_PUBLIC_TIMELINE_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL = 'https://atlanta2.relaygateway.net/paradigm-threat-files'
    process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = 'https://atlanta2.relaygateway.net/paradigm-threat-timeline'
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
      'https://atlanta2.relaygateway.net/paradigm-threat-files/science/geoengineering/foo.png?w=160',
    )
    assert.doesNotMatch(url, /\/api\/image/)
  })

  it('uses timeline mirror for media/ paths', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/media/cover.jpg', 400)
    assert.match(url, /paradigm-threat-timeline\/media\/cover\.jpg\?w=400/)
  })

  it('returns SVG without w query', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/site/icon.svg')
    assert.equal(url, 'https://atlanta2.relaygateway.net/paradigm-threat-files/site/icon.svg')
    assert.doesNotMatch(url, /\?w=/)
  })

  it('defaults raster width to 800', async () => {
    const { buildOptimizedAssetUrl } = await import('./relayOptimizedAssetUrl.ts')
    const url = buildOptimizedAssetUrl('/cosmos/mars/massacre.jpg')
    assert.match(url, /\?w=800$/)
  })

  it('listOptimizedAssetUrls preserves absolute https URLs (no mirror path mangling)', async () => {
    const { buildOptimizedAssetUrl, listOptimizedAssetUrls } = await import('./relayOptimizedAssetUrl.ts')
    const abs =
      'https://paradigmthreat.net/influence/controlled_opposition/investigations/cave-story-header.png'
    const expected = buildOptimizedAssetUrl(abs, 800)
    const mirrors = listOptimizedAssetUrls(abs, 800)
    assert.deepEqual(mirrors, [expected])
    assert.match(expected, /\?w=800$/)
  })
})
