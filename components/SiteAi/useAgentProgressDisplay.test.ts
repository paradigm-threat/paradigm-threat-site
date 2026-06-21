import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AGENT_STALL_ERROR_MESSAGE } from '@/lib/siteAi/agentProgress'
import { STALL_ERROR_MS, ZERO_DOWNLOAD_STALL_MS } from './useAgentProgressDisplay.ts'

describe('useAgentProgressDisplay constants', () => {
  it('exports reasonable stall thresholds and message', () => {
    assert.equal(STALL_ERROR_MS, 90_000)
    assert.equal(ZERO_DOWNLOAD_STALL_MS, 45_000)
    assert.ok(AGENT_STALL_ERROR_MESSAGE.includes('on-device-internals'))
  })
})
