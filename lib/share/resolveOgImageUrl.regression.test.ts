import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('resolveOgImageUrl / appendOgShareWidthParam', () => {
  it('adds ?w= to first relative raster under /files/', async () => {
    const { extractFirstImageUrlFromMarkdown, OG_SHARE_IMAGE_WIDTH } = await import('./resolveOgImageUrl.ts')
    const md = '![x](hero.png)'
    const url = extractFirstImageUrlFromMarkdown(md, 'governance/war')
    assert.equal(
      url,
      `https://paradigmthreat.net/files/governance/war/hero.png?w=${OG_SHARE_IMAGE_WIDTH}`,
    )
  })

  it('adds ?w= to same-origin absolute raster URLs', async () => {
    const { appendOgShareWidthParam, OG_SHARE_IMAGE_WIDTH } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam('https://paradigmthreat.net/governance/war/mission-accomplished-again-iran-2026.png'),
      `https://paradigmthreat.net/governance/war/mission-accomplished-again-iran-2026.png?w=${OG_SHARE_IMAGE_WIDTH}`,
    )
  })

  it('does not add ?w= to SVG on canonical site', async () => {
    const { appendOgShareWidthParam } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam('https://paradigmthreat.net/files/site/favicon.svg'),
      'https://paradigmthreat.net/files/site/favicon.svg',
    )
  })

  it('does not add ?w= to off-site rasters', async () => {
    const { appendOgShareWidthParam } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam('https://example.com/cdn/pic.jpg'),
      'https://example.com/cdn/pic.jpg',
    )
  })
})
