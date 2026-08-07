import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

const FILES_BASE = 'https://paradigm-threat-files.dfw1.relaygateway.net'
const TIMELINE_BASE = 'https://paradigm-threat-timeline.dfw1.relaygateway.net'

describe('processImageProps (Relay mirrors, never /api/image)', () => {
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

  it('rewrites canonical-site absolute PNG to primary relay ?w=800', async () => {
    const { processImageProps } = await import('./imageHelper.ts')
    const out = processImageProps({
      src: 'https://paradigmthreat.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease.png',
      alt: 'lead',
    })
    assert.match(
      String(out.optimizedSrc),
      /^https:\/\/paradigm-threat-files\.dfw1\.relaygateway\.net\/history\/chronology\/napoleon/,
    )
    assert.match(String(out.optimizedSrc), /\?w=800/)
    assert.doesNotMatch(String(out.optimizedSrc), /\/api\/image/)
    assert.ok(Array.isArray(out.mirrorSrcs) && out.mirrorSrcs.length >= 1)
    for (const u of out.mirrorSrcs as string[]) {
      assert.doesNotMatch(u, /\/api\/image/)
    }
  })

  it('rewrites repo-relative PNG to relay ?w=', async () => {
    const { processImageProps } = await import('./imageHelper.ts')
    const out = processImageProps(
      { src: './foo.png', w: 400 },
      'history/chronology',
    )
    assert.equal(
      out.optimizedSrc,
      'https://paradigm-threat-files.dfw1.relaygateway.net/history/chronology/foo.png?w=400',
    )
    assert.doesNotMatch(String(out.optimizedSrc), /\/api\/image/)
  })

  it('embedding.jpg path matches live article asset', async () => {
    const { processImageProps } = await import('./imageHelper.ts')
    const out = processImageProps({
      src: '/influence/conspiracy/embedding.jpg',
      w: 360,
    })
    assert.equal(
      out.optimizedSrc,
      'https://paradigm-threat-files.dfw1.relaygateway.net/influence/conspiracy/embedding.jpg?w=360',
    )
    assert.doesNotMatch(String(out.optimizedSrc), /\/api\/image/)
  })

  it('emits -portrait sibling URLs for raster art direction', async () => {
    const { processImageProps, portraitSiblingPath, PORTRAIT_MEDIA_QUERY } = await import(
      './imageHelper.ts'
    )
    assert.equal(
      portraitSiblingPath('/governance/war/presidential-alignment-scorecard-au046.png'),
      '/governance/war/presidential-alignment-scorecard-au046-portrait.png',
    )
    assert.equal(
      portraitSiblingPath('/governance/war/presidential-alignment-scorecard-au046-portrait.png'),
      null,
    )
    const out = processImageProps({
      src: '/governance/war/presidential-alignment-scorecard-au046.png',
      w: 800,
    })
    assert.equal(
      out.portraitOptimizedSrc,
      'https://paradigm-threat-files.dfw1.relaygateway.net/governance/war/presidential-alignment-scorecard-au046-portrait.png?w=800',
    )
    assert.equal(out.portraitMedia, PORTRAIT_MEDIA_QUERY)
    assert.match(String(out.optimizedSrc), /presidential-alignment-scorecard-au046\.png\?w=800/)
    assert.doesNotMatch(String(out.optimizedSrc), /-portrait/)
  })
})
