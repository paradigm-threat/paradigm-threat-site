import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('getTimelineEventMeta ogImageUrl', () => {
  const prevTimeline = process.env.NEXT_PUBLIC_TIMELINE_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_TIMELINE_BASE_URL =
      'https://paradigm-threat-timeline.iad1.relaygateway.net'
  })

  after(() => {
    if (prevTimeline === undefined) delete process.env.NEXT_PUBLIC_TIMELINE_BASE_URL
    else process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = prevTimeline
  })

  it('includes ?w= on raster timeline OG paths', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method || '').toUpperCase() === 'QUERY') {
        return new Response(JSON.stringify({
          status: 'ok',
          collection: 'events',
          query: '',
          count: 1,
          docCount: 1,
          results: [
            {
              id: 'evt-test-og',
              title: 'Test OG',
              media: ['/media/00.overview/paradigm-threat-the-third-story.png'],
              children: [],
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return originalFetch(_input, init)
    }) as typeof fetch

    try {
      const { getTimelineEventMeta } = await import(`./timelineEventServer.ts?t=${Date.now()}`)
      const meta = await getTimelineEventMeta('evt-test-og')
      assert.ok(meta?.ogImageUrl)
      assert.match(
        meta.ogImageUrl,
        /relaygateway\.net\/media\/00\.overview\/paradigm-threat-the-third-story\.png\?w=\d+/,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
