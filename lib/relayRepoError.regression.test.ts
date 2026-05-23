import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isRelayRepoNotFoundJson } from '@/lib/relayRepoError'

describe('isRelayRepoNotFoundJson', () => {
  it('detects relay missing-file JSON payloads', () => {
    const sample =
      '{"ok":false,"status":"not_found","path":"history/foo.png.md","messageForReaders":"x"}'
    assert.equal(isRelayRepoNotFoundJson(sample), true)
  })

  it('returns false for markdown bodies', () => {
    assert.equal(isRelayRepoNotFoundJson('# Title\n\nHello'), false)
  })
})
