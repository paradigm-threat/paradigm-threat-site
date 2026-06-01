import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'

describe('getTimelineEventMeta ogImageUrl', () => {
  const prevTimeline = process.env.NEXT_PUBLIC_TIMELINE_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_TIMELINE_BASE_URL =
      'https://paradigm-threat-timeline.dfw1.relaygateway.net'
  })

  after(() => {
    if (prevTimeline === undefined) delete process.env.NEXT_PUBLIC_TIMELINE_BASE_URL
    else process.env.NEXT_PUBLIC_TIMELINE_BASE_URL = prevTimeline
  })

  it('includes ?w= on raster timeline OG paths', async () => {
    const eventsPayload = {
      entries: [
        {
          id: 'evt-test-og',
          title: 'Test OG',
          media: ['/media/00.overview/paradigm-threat-the-third-story.png'],
        },
      ],
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/data/events.json')) {
        return new Response(JSON.stringify(eventsPayload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return originalFetch(input)
    }) as typeof fetch

    try {
      const { getTimelineEventMeta } = await import('./timelineEventServer.ts')
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
