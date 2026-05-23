import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('canonicalSiteAssetToMirrorUrl', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL =
      'https://atlanta2.relaygateway.net/paradigm-threat-files'
  })

  after(() => {
    if (prevFiles === undefined) delete process.env.NEXT_PUBLIC_FILES_BASE_URL
    else process.env.NEXT_PUBLIC_FILES_BASE_URL = prevFiles
  })

  it('rewrites paradigmthreat.net raster URLs to relay mirror with ?w=', async () => {
    const { canonicalSiteAssetToMirrorUrl } = await import('./canonicalSiteAssetUrl.ts')
    const out = canonicalSiteAssetToMirrorUrl(
      'https://paradigmthreat.net/history/foo.png',
      160,
    )
    assert.equal(
      out,
      'https://atlanta2.relaygateway.net/paradigm-threat-files/history/foo.png?w=160',
    )
  })

  it('returns null for non-site origins', async () => {
    const { canonicalSiteAssetToMirrorUrl } = await import('./canonicalSiteAssetUrl.ts')
    assert.equal(
      canonicalSiteAssetToMirrorUrl('https://example.com/foo.png', 160),
      null,
    )
  })

  it('returns null for non-raster paths', async () => {
    const { canonicalSiteAssetToMirrorUrl } = await import('./canonicalSiteAssetUrl.ts')
    assert.equal(
      canonicalSiteAssetToMirrorUrl('https://paradigmthreat.net/blog/post.md'),
      null,
    )
  })

  it('strips legacy /files/ prefix', async () => {
    const { relPathFromCanonicalSiteUrl } = await import('./canonicalSiteAssetUrl.ts')
    assert.equal(
      relPathFromCanonicalSiteUrl(
        'https://paradigmthreat.net/files/history/chronology/foo.png',
      ),
      'history/chronology/foo.png',
    )
  })

  it('rewrites napoleon chronology image path to relay', async () => {
    const { canonicalSiteAssetToMirrorUrl } = await import('./canonicalSiteAssetUrl.ts')
    const out = canonicalSiteAssetToMirrorUrl(
      'https://paradigmthreat.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease-quote.png',
      800,
    )
    assert.equal(
      out,
      'https://atlanta2.relaygateway.net/paradigm-threat-files/history/chronology/napoleon-corpses-dry-egypt-siberian-disease-quote.png?w=800',
    )
  })
})
