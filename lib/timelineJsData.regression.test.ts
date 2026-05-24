import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTimelineJsJsonFromEvents } from './timelineJsData.ts'

describe('buildTimelineJsJsonFromEvents', () => {
  it('builds eras and deduped events', () => {
    const json = buildTimelineJsJsonFromEvents([
      {
        id: 'evt-a',
        title: 'Event A',
        dates: [{ start: -1000 }],
        md_path: '/blog/a.md',
      },
      {
        id: 'evt-b',
        title: 'Dup',
        dates: [{ start: -500 }],
        md_path: '/blog/a.md',
      },
    ]) as { events: { unique_id: string }[]; eras: unknown[] }

    assert.ok(Array.isArray(json.eras) && json.eras.length > 0)
    assert.equal(json.events.length, 1)
    assert.equal(json.events[0]!.unique_id, 'evt-a')
  })
})
