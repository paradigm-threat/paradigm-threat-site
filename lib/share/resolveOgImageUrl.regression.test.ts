import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('resolveOgImageUrl / appendOgShareWidthParam', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL =
      'https://paradigm-threat-files.dfw1.relaygateway.net'
  })

  after(() => {
    if (prevFiles === undefined) delete process.env.NEXT_PUBLIC_FILES_BASE_URL
    else process.env.NEXT_PUBLIC_FILES_BASE_URL = prevFiles
  })

  it('adds ?w= to first relative raster on primary files mirror', async () => {
    const { extractFirstImageUrlFromMarkdown, OG_SHARE_IMAGE_WIDTH } = await import('./resolveOgImageUrl.ts')
    const md = '![x](hero.png)'
    const url = extractFirstImageUrlFromMarkdown(md, 'governance/war')
    assert.equal(
      url,
      `https://paradigm-threat-files.dfw1.relaygateway.net/governance/war/hero.png?w=${OG_SHARE_IMAGE_WIDTH}`,
    )
    assert.doesNotMatch(url, /\/files\//)
  })

  it('maps legacy /files/ absolute URLs to mirror + w', async () => {
    const { appendOgShareWidthParam, OG_SHARE_IMAGE_WIDTH } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam(
        'https://paradigmthreat.net/files/governance/war/hero.png',
      ),
      `https://paradigm-threat-files.dfw1.relaygateway.net/governance/war/hero.png?w=${OG_SHARE_IMAGE_WIDTH}`,
    )
  })

  it('maps same-origin absolute raster paths to mirror', async () => {
    const { appendOgShareWidthParam, OG_SHARE_IMAGE_WIDTH } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam(
        'https://paradigmthreat.net/governance/war/mission-accomplished-again-iran-2026.png',
      ),
      `https://paradigm-threat-files.dfw1.relaygateway.net/governance/war/mission-accomplished-again-iran-2026.png?w=${OG_SHARE_IMAGE_WIDTH}`,
    )
  })

  it('does not add ?w= to SVG on mirror', async () => {
    const { appendOgShareWidthParam } = await import('./resolveOgImageUrl.ts')
    assert.equal(
      appendOgShareWidthParam(
        'https://paradigm-threat-files.dfw1.relaygateway.net/site/favicon.svg',
      ),
      'https://paradigm-threat-files.dfw1.relaygateway.net/site/favicon.svg',
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
