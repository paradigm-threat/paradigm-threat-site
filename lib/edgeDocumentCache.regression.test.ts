import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  EDGE_DOCUMENT_ISR_SEC,
  EDGE_DOCUMENT_S_MAXAGE,
  edgeDocumentCacheControlHeader,
} from './edgeDocumentCache.ts'

describe('edgeDocumentCache', () => {
  const prevRelay = process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH

  afterEach(() => {
    if (prevRelay === undefined) delete process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH
    else process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH = prevRelay
  })

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH
  })

  it('defaults to 24h ISR when server relay fetch is off', () => {
    assert.equal(EDGE_DOCUMENT_ISR_SEC, 86_400)
    assert.equal(EDGE_DOCUMENT_S_MAXAGE, 86_400)
    assert.match(
      edgeDocumentCacheControlHeader(),
      /s-maxage=86400.*stale-while-revalidate=604800/,
    )
  })

})
