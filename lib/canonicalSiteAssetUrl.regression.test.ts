import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

const FILES_BASE = 'https://paradigm-threat-files.dfw1.relaygateway.net'
const TIMELINE_BASE = 'https://paradigm-threat-timeline.dfw1.relaygateway.net'

describe('canonicalSiteAssetToMirrorUrl', () => {
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

  it('rewrites paradigmthreat.net raster URLs to relay mirror with ?w=', async () => {
    const { canonicalSiteAssetToMirrorUrl } = await import('./canonicalSiteAssetUrl.ts')
    const out = canonicalSiteAssetToMirrorUrl(
      'https://paradigmthreat.net/history/foo.png',
      160,
    )
    assert.equal(
      out,
      'https://paradigm-threat-files.dfw1.relaygateway.net/history/foo.png?w=160',
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

  it('strips legacy /files/timeline/ prefix to timeline media path', async () => {
    const { relPathFromCanonicalSiteUrl, canonicalSiteAssetToMirrorUrl } = await import(
      './canonicalSiteAssetUrl.ts',
    )
    const legacy =
      'https://paradigmthreat.net/files/timeline/media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png'
    assert.equal(
      relPathFromCanonicalSiteUrl(legacy),
      'media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png',
    )
    const out = canonicalSiteAssetToMirrorUrl(legacy, 800)
    assert.equal(
      out,
      'https://paradigm-threat-timeline.dfw1.relaygateway.net/media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png?w=800',
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
      'https://paradigm-threat-files.dfw1.relaygateway.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease-quote.png?w=800',
    )
  })
})
