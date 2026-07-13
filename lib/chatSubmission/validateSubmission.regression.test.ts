import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseChatSubmissionBody } from './validateSubmission.ts'

describe('parseChatSubmissionBody', () => {
  it('accepts named post', () => {
    const r = parseChatSubmissionBody({
      channel: 'general',
      content: 'hello there',
      username: 'ari',
      is_anonymous: false,
    })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.data.author, 'ari')
      assert.equal(r.data.anonymous, false)
    }
  })

  it('defaults to anonymous', () => {
    const r = parseChatSubmissionBody({
      channel: 'general',
      content: 'hello',
    })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.data.anonymous, true)
  })

  it('rejects empty content', () => {
    const r = parseChatSubmissionBody({ channel: 'general', content: '' })
    assert.equal(r.ok, false)
  })
})
