import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('processImageProps (Relay mirrors, no /api/image)', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL
  const prevTimeline = process.env.NEXT_PUBLIC_TIMELINE_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL =
      'https://atlanta2.relaygateway.net/paradigm-threat-files'
    process.env.NEXT_PUBLIC_TIMELINE_BASE_URL =
      'https://atlanta2.relaygateway.net/paradigm-threat-timeline'
  })

  after(() => {
    if (prevFiles === undefined) delete process.env.NEXT_PUBLIC_FILES_BASE_URL
    else process.env.NEXT_PUBLIC_FILES_BASE_URL = prevFiles
    if (prevTimeline === undefined) delete process.env.NEXT_PUBLIC_TIMELINE_BASE_URL
    else process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = prevTimeline
  })

  it('rewrites canonical-site absolute PNG to relay ?w=800', async () => {
    const { processImageProps } = await import('./imageHelper.ts')
    const out = processImageProps({
      src: 'https://paradigmthreat.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease.png',
      alt: 'lead',
    })
    assert.match(
      String(out.optimizedSrc),
      /\.relaygateway\.net\/paradigm-threat-files\/history\/chronology\/napoleon/,
    )
    assert.match(String(out.optimizedSrc), /\?w=800/)
    assert.doesNotMatch(String(out.optimizedSrc), /\/api\/image/)
    assert.ok(Array.isArray(out.mirrorSrcs) && out.mirrorSrcs.length >= 1)
  })

  it('rewrites repo-relative PNG to relay ?w=', async () => {
    const { processImageProps } = await import('./imageHelper.ts')
    const out = processImageProps(
      { src: './foo.png', w: 400 },
      'history/chronology',
    )
    assert.match(String(out.optimizedSrc), /paradigm-threat-files\/history\/chronology\/foo\.png\?w=400/)
    assert.doesNotMatch(String(out.optimizedSrc), /\/api\/image/)
  })

  it('galleryRelayThumbnailUrl uses relay only', async () => {
    const { galleryRelayThumbnailUrl } = await import('./imageHelper.ts')
    const url = galleryRelayThumbnailUrl(
      'https://paradigmthreat.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease.png',
      400,
    )
    assert.match(url, /\?w=400/)
    assert.doesNotMatch(url, /\/api\/image/)
  })
})
