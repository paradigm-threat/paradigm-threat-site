import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeSubmissionUrls,
  parseInvestigationSubmissionBody,
  toPublicInvestigationSubmission,
} from './validateSubmission.ts'

describe('validateSubmission', () => {
  it('normalizes and dedupes http(s) urls', () => {
    const urls = normalizeSubmissionUrls([
      'https://example.com/a',
      'https://example.com/a',
      'http://foo.bar',
      'data:text/plain,hi',
      'ftp://bad',
    ])
    assert.deepEqual(urls, ['https://example.com/a', 'http://foo.bar'])
  })

  it('rejects honeypot website field', () => {
    const result = parseInvestigationSubmissionBody({
      topic: 'Test topic',
      description: 'A long enough description for validation to pass here.',
      website: 'spam',
    })
    assert.equal(result.ok, false)
  })

  it('strips email when anonymous', () => {
    const result = parseInvestigationSubmissionBody({
      topic: 'RFK staging',
      description: 'Detailed description of what to investigate and why.',
      email: 'test@example.com',
      is_anonymous: true,
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.data.email, null)
      assert.equal(result.data.is_anonymous, true)
    }
  })

  it('public DTO omits email', () => {
    const pub = toPublicInvestigationSubmission({
      id: 1,
      created_at: '2026-06-29T12:00:00.000Z',
      topic: 'Topic',
      description: 'Body',
      urls: ['https://a.com'],
      is_anonymous: true,
    })
    assert.equal(pub.id, 1)
    assert.equal(pub.topic, 'Topic')
    assert.deepEqual(pub.urls, ['https://a.com'])
    assert.equal('email' in pub, false)
  })
})
