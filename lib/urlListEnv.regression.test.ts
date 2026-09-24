import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseUrlList, relayPairNodeKey, rewriteRetiredRelayOrigin, zipRelayPairs } from './urlListEnv.ts'

const FILES = [
  'https://paradigm-threat-files.iad1.relaygateway.net',
  'https://paradigm-threat-files.hkg1.relaygateway.net',
]
const TIMELINE_MISORDERED = [
  'https://paradigm-threat-timeline.hkg1.relaygateway.net',
  'https://paradigm-threat-timeline.iad1.relaygateway.net',
]

describe('zipRelayPairs pairs by node hostname', () => {
  it('extracts iad1.relaygateway.net from files and timeline hosts', () => {
    assert.equal(relayPairNodeKey(FILES[0]!), 'iad1.relaygateway.net')
    assert.equal(
      relayPairNodeKey('https://paradigm-threat-timeline.iad1.relaygateway.net/'),
      'iad1.relaygateway.net',
    )
  })

  it('does not zip iad1 files with hkg1 timeline when lists are misordered', () => {
    const pairs = zipRelayPairs(FILES, TIMELINE_MISORDERED)
    assert.equal(pairs.length, 2)
    assert.deepEqual(pairs[0], {
      files: FILES[0],
      timeline: 'https://paradigm-threat-timeline.iad1.relaygateway.net',
    })
    assert.deepEqual(pairs[1], {
      files: FILES[1],
      timeline: 'https://paradigm-threat-timeline.hkg1.relaygateway.net',
    })
  })

  it('keeps files-list order when both lists already match', () => {
    const timeline = [
      'https://paradigm-threat-timeline.iad1.relaygateway.net',
      'https://paradigm-threat-timeline.hkg1.relaygateway.net',
    ]
    const pairs = zipRelayPairs(FILES, timeline)
    assert.equal(pairs[0]?.files, FILES[0])
    assert.equal(pairs[0]?.timeline, timeline[0])
  })
})

describe('retired lon1/dfw1/sjc1 rewrite', () => {
  it('maps lon1.relaygateway.net to iad1', () => {
    assert.equal(
      rewriteRetiredRelayOrigin('https://paradigm-threat-files.lon1.relaygateway.net'),
      'https://paradigm-threat-files.iad1.relaygateway.net',
    )
  })

  it('maps dfw1.relaygateway.net to iad1', () => {
    assert.equal(
      rewriteRetiredRelayOrigin('https://paradigm-threat-timeline.dfw1.relaygateway.net'),
      'https://paradigm-threat-timeline.iad1.relaygateway.net',
    )
  })

  it('maps sjc1.relaygateway.net to iad1', () => {
    assert.equal(
      rewriteRetiredRelayOrigin('https://paradigm-threat-files.sjc1.relaygateway.net'),
      'https://paradigm-threat-files.iad1.relaygateway.net',
    )
  })

  it('parseUrlList rewrites and dedupes retired hosts next to iad1', () => {
    const list = parseUrlList(
      'https://paradigm-threat-files.dfw1.relaygateway.net https://paradigm-threat-files.lon1.relaygateway.net https://paradigm-threat-files.sjc1.relaygateway.net https://paradigm-threat-files.iad1.relaygateway.net https://paradigm-threat-files.hkg1.relaygateway.net',
    )
    assert.deepEqual(list, [
      'https://paradigm-threat-files.iad1.relaygateway.net',
      'https://paradigm-threat-files.hkg1.relaygateway.net',
    ])
  })
})
