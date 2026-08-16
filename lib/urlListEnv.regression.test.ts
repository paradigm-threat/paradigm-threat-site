import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { relayPairNodeKey, zipRelayPairs } from './urlListEnv.ts'

const FILES = [
  'https://paradigm-threat-files.dfw1.relaygateway.net',
  'https://paradigm-threat-files.lon1.relaygateway.net',
  'https://paradigm-threat-files.hkg1.relaygateway.net',
]
const TIMELINE_MISORDERED = [
  'https://paradigm-threat-timeline.lon1.relaygateway.net',
  'https://paradigm-threat-timeline.dfw1.relaygateway.net',
  'https://paradigm-threat-timeline.hkg1.relaygateway.net',
]

describe('zipRelayPairs pairs by node hostname', () => {
  it('extracts dfw1.relaygateway.net from files and timeline hosts', () => {
    assert.equal(relayPairNodeKey(FILES[0]!), 'dfw1.relaygateway.net')
    assert.equal(
      relayPairNodeKey('https://paradigm-threat-timeline.dfw1.relaygateway.net/'),
      'dfw1.relaygateway.net',
    )
  })

  it('does not zip dfw1 files with lon1 timeline when lists are misordered', () => {
    const pairs = zipRelayPairs(FILES, TIMELINE_MISORDERED)
    assert.equal(pairs.length, 3)
    assert.deepEqual(pairs[0], {
      files: FILES[0],
      timeline: 'https://paradigm-threat-timeline.dfw1.relaygateway.net',
    })
    assert.deepEqual(pairs[1], {
      files: FILES[1],
      timeline: 'https://paradigm-threat-timeline.lon1.relaygateway.net',
    })
    assert.deepEqual(pairs[2], {
      files: FILES[2],
      timeline: 'https://paradigm-threat-timeline.hkg1.relaygateway.net',
    })
  })

  it('keeps files-list order when both lists already match', () => {
    const timeline = [
      'https://paradigm-threat-timeline.dfw1.relaygateway.net',
      'https://paradigm-threat-timeline.lon1.relaygateway.net',
      'https://paradigm-threat-timeline.hkg1.relaygateway.net',
    ]
    const pairs = zipRelayPairs(FILES, timeline)
    assert.equal(pairs[0]?.files, FILES[0])
    assert.equal(pairs[0]?.timeline, timeline[0])
  })
})
