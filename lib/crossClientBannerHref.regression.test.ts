import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  archivePrettyPath,
  isMdCorpusSubpath,
  productionBannerHref,
} from './crossClientBannerHref.ts'

describe('crossClientBannerHref', () => {
  it('defaults app shells and home to the Relay apex', () => {
    assert.equal(isMdCorpusSubpath('/'), false)
    assert.equal(isMdCorpusSubpath('/page.md'), false)
    assert.equal(isMdCorpusSubpath('/search'), false)
    assert.equal(isMdCorpusSubpath('/timeline/evt-x'), false)
    assert.equal(isMdCorpusSubpath('/articles'), false)
    assert.equal(productionBannerHref('/'), 'https://paradigmthreat.net/')
    assert.equal(productionBannerHref('/chat'), 'https://paradigmthreat.net/')
  })

  it('keeps nested pretty and .md article paths', () => {
    assert.equal(
      productionBannerHref(
        '/science/computing/crichtons-prophecy.md?x=1',
      ),
      'https://paradigmthreat.net/science/computing/crichtons-prophecy',
    )
    assert.equal(
      productionBannerHref(
        '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation',
      ),
      'https://paradigmthreat.net/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation',
    )
    assert.equal(
      archivePrettyPath('/blog/2026-03-11-timeline-update.md'),
      '/blog/2026-03-11-timeline-update',
    )
  })

  it('ignores rasters and Next internals', () => {
    assert.equal(isMdCorpusSubpath('/science/computing/crichtons-prophecy.png'), false)
    assert.equal(isMdCorpusSubpath('/_next/image'), false)
    assert.equal(productionBannerHref('/foo.png'), 'https://paradigmthreat.net/')
  })
})
