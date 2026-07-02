import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Regression: useShareLinksModel subscribes to remoteRelay.getSnapshot() wholesale.
 * getSnapshot must return a stable reference until emit() invalidates it.
 */
describe('remoteRelay getSnapshot stability', () => {
  it('returns the same object reference across consecutive calls', async () => {
    const { remoteRelay } = await import('./remoteRelayStore')
    const a = remoteRelay.getSnapshot()
    const b = remoteRelay.getSnapshot()
    assert.equal(a, b)
  })
})
