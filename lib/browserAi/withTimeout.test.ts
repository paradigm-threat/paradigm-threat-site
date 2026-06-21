import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TimeoutError, withTimeout } from './withTimeout.ts'

describe('withTimeout', () => {
  it('resolves when promise completes in time', async () => {
    const value = await withTimeout(Promise.resolve(42), 500, 'test')
    assert.equal(value, 42)
  })

  it('rejects with TimeoutError when promise is slow', async () => {
    await assert.rejects(
      () => withTimeout(new Promise((resolve) => setTimeout(() => resolve('late'), 50)), 10, 'slow op'),
      (e: unknown) => e instanceof TimeoutError && (e as Error).message.includes('slow op'),
    )
  })
})
