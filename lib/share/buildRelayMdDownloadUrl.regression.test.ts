import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRelayMdDownloadUrl,
  relayMdDownloadFilename,
  resolveArticleMdRelPathForDownload,
  shouldOfferRelayMdDownload,
} from './buildRelayMdDownloadUrl.ts'

describe('buildRelayMdDownloadUrl', () => {
  it('builds encoded mirror URL', () => {
    assert.equal(
      buildRelayMdDownloadUrl(
        'https://paradigm-threat-files.iad1.relaygateway.net',
        'science/computing/foo.md',
      ),
      'https://paradigm-threat-files.iad1.relaygateway.net/science/computing/foo.md',
    )
  })

  it('prefers resolved mdRelayPath over guess', () => {
    assert.equal(
      resolveArticleMdRelPathForDownload('/events/jfk', 'events/jfk/page.md'),
      'events/jfk/page.md',
    )
    assert.equal(
      resolveArticleMdRelPathForDownload('/science/foo', undefined),
      'science/foo.md',
    )
  })

  it('skips plain-text leaves unless path is known', () => {
    assert.equal(shouldOfferRelayMdDownload('/notes/readme.txt', undefined, 'hello'), false)
    assert.equal(shouldOfferRelayMdDownload('/notes/readme.txt', 'notes/readme.txt', 'hello'), true)
    assert.equal(relayMdDownloadFilename('events/jfk/page.md'), 'page.md')
  })
})
