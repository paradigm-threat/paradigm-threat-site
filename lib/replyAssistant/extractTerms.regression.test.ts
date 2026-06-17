import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractTermsFromText, extractedSearchQueries } from './extractTerms.ts'

describe('extractTermsFromText', () => {
  it('drops stopwords and extracts distinctive terms', () => {
    const terms = extractTermsFromText(
      'The mud flood theory is interesting but the mainstream says it was just erosion and weathering.'
    )
    assert.ok(terms.includes('mud'))
    assert.ok(terms.includes('flood'))
    assert.ok(!terms.includes('the'))
    assert.ok(!terms.includes('was'))
  })

  it('strips URLs', () => {
    const terms = extractTermsFromText('Check https://example.com/foo tartaria maps for more')
    assert.ok(terms.includes('tartaria'))
    assert.ok(!terms.includes('https'))
  })
})

describe('extractedSearchQueries', () => {
  it('builds paired queries from top terms', () => {
    const q = extractedSearchQueries(['tartaria', 'mud', 'flood'])
    assert.ok(q.some((s) => s.includes('tartaria')))
    assert.ok(q.includes('tartaria'))
  })
})
