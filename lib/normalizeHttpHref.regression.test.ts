import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lookupHttpHref, normalizeHttpHref, parseDeadUrlMap } from './normalizeHttpHref.ts'

describe('normalizeHttpHref', () => {
  it('lowercases host and drops fragment', () => {
    assert.equal(
      normalizeHttpHref('https://Example.COM/Path#frag'),
      'https://example.com/Path',
    )
  })
  it('drops trailing slash on paths but keeps origin slash', () => {
    assert.equal(normalizeHttpHref('https://example.com/foo/'), 'https://example.com/foo')
    assert.equal(normalizeHttpHref('https://example.com'), 'https://example.com/')
    assert.equal(normalizeHttpHref('https://example.com/'), 'https://example.com/')
  })
  it('drops default ports and keeps query', () => {
    assert.equal(
      normalizeHttpHref('https://example.com:443/a?x=1'),
      'https://example.com/a?x=1',
    )
    assert.equal(normalizeHttpHref('http://example.com:80/a'), 'http://example.com/a')
  })
  it('does not rewrite http to https or strip www', () => {
    assert.equal(normalizeHttpHref('http://www.example.com/a'), 'http://www.example.com/a')
  })
  it('leaves relative and mailto unchanged', () => {
    assert.equal(normalizeHttpHref('/foo'), '/foo')
    assert.equal(normalizeHttpHref('mailto:a@b.c'), 'mailto:a@b.c')
  })
  it('returns original on parse failure', () => {
    assert.equal(normalizeHttpHref('https://'), 'https://')
  })
})

describe('lookupHttpHref', () => {
  const map = {
    'https://example.com/gone': { reason: 'http_404', status: 404 },
  }
  it('hits after normalize and misses otherwise', () => {
    assert.equal(lookupHttpHref(map, 'https://Example.COM/gone#x')?.reason, 'http_404')
    assert.equal(lookupHttpHref(null, 'https://example.com/gone'), null)
    assert.equal(lookupHttpHref(map, 'https://example.com/live'), null)
  })
})

describe('parseDeadUrlMap', () => {
  it('returns {} on empty or invalid', () => {
    assert.deepEqual(parseDeadUrlMap(''), {})
    assert.deepEqual(parseDeadUrlMap('['), {})
    assert.deepEqual(parseDeadUrlMap('[]'), {})
  })
})
