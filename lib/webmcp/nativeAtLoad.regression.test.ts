import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  nativeWebMcpAvailableAtLoad,
  resetNativeWebMcpCaptureForTests,
} from './nativeAtLoad.ts'

describe('nativeWebMcpAvailableAtLoad', () => {
  afterEach(() => {
    resetNativeWebMcpCaptureForTests()
  })

  it('returns false when document is unavailable', () => {
    assert.equal(nativeWebMcpAvailableAtLoad(), false)
  })

  it('caches the first result', () => {
    const first = nativeWebMcpAvailableAtLoad()
    const second = nativeWebMcpAvailableAtLoad()
    assert.equal(first, second)
  })
})
