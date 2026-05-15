import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveSeoArticleInternalNavHref } from './resolveSeoArticleInternalNavHref.ts'

const ORIGIN = 'https://paradigmthreat.net'

describe('resolveSeoArticleInternalNavHref', () => {
  it('returns null for empty / whitespace-only', () => {
    assert.equal(resolveSeoArticleInternalNavHref('', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('   ', ORIGIN), null)
  })

  it('returns null for fragments and dangerous / non-nav schemes', () => {
    assert.equal(resolveSeoArticleInternalNavHref('#x', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('mailto:a@b', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('tel:+1', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('javascript:void(0)', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('data:text/html,hi', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('vbscript:msgbox(1)', ORIGIN), null)
  })

  it('returns null for protocol-relative URLs', () => {
    assert.equal(resolveSeoArticleInternalNavHref('//evil.example/phish', ORIGIN), null)
  })

  it('returns null for external absolute URLs', () => {
    assert.equal(resolveSeoArticleInternalNavHref('https://other.example/p', ORIGIN), null)
    assert.equal(resolveSeoArticleInternalNavHref('http://other.example/p', ORIGIN), null)
  })

  it('maps same-origin absolute URL to path + search + hash', () => {
    assert.equal(
      resolveSeoArticleInternalNavHref('https://paradigmthreat.net/foo?q=1#h', ORIGIN),
      '/foo?q=1#h'
    )
  })

  it('maps root-relative href including query and hash', () => {
    assert.equal(resolveSeoArticleInternalNavHref('/bar', ORIGIN), '/bar')
    assert.equal(resolveSeoArticleInternalNavHref('  /bar?q=2#z  ', ORIGIN), '/bar?q=2#z')
  })

  it('returns null for relative paths without leading slash', () => {
    assert.equal(resolveSeoArticleInternalNavHref('relative.md', ORIGIN), null)
  })

  it('invalid absolute URL returns null', () => {
    assert.equal(resolveSeoArticleInternalNavHref('https://[', ORIGIN), null)
  })
})
