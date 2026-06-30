import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildShareRewriteSystemPrompt,
  buildShareRewriteUserPrompt,
  shareRewriteCharLimit,
} from './buildShareRewritePrompt.ts'

describe('buildShareRewritePrompt', () => {
  it('includes tone and platform limit in prompts', () => {
    const system = buildShareRewriteSystemPrompt('brief')
    assert.match(system, /brief/i)
    assert.match(system, /complete sentences/i)

    const user = buildShareRewriteUserPrompt({
      platform: 'instagram',
      title: 'Test Article',
      canonicalUrl: 'https://paradigmthreat.net/test',
      substackUrl: 'https://example.substack.com/p/test',
      hashtagsLine: '#test #article',
      articlePlain: 'Full body paragraph one.\n\nParagraph two.',
      templateCopy: 'Test Article\n\nTruncated…',
      maxChars: shareRewriteCharLimit('instagram'),
    })
    assert.match(user, /Instagram/)
    assert.match(user, /Character limit: 2200/)
    assert.match(user, /Full body paragraph one/)
    assert.match(user, /Truncated/)
    assert.match(user, /#test #article/)
  })
})
