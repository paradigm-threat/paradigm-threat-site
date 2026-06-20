import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractReplySourceText, hasReplySourceText } from './extractReplySourceText.ts'
import { isSiteAiReplyStarterPrompt, SITE_AI_REPLY_STARTERS } from './siteAiReplyStarters.ts'

describe('extractReplySourceText', () => {
  it('does not treat reply starter prompts as pasted source', () => {
    for (const starter of SITE_AI_REPLY_STARTERS) {
      assert.equal(extractReplySourceText({ question: starter.prompt, history: [] }), null)
      assert.equal(isSiteAiReplyStarterPrompt(starter.prompt), true)
    }
  })

  it('extracts pasted post from follow-up message', () => {
    const socialPrompt = SITE_AI_REPLY_STARTERS.find((s) => s.id === 'social-thread')!.prompt
    const pasted = 'The mud flood never happened — it was just urban renewal and you people are gullible.'
    const source = extractReplySourceText({
      question: pasted,
      history: [{ role: 'user', content: socialPrompt }],
    })
    assert.equal(source, pasted)
    assert.equal(hasReplySourceText({ question: pasted, history: [] }), true)
  })
})

describe('siteAiReplyStarters', () => {
  it('antisemitism playbook matches real trope text when user pastes', async () => {
    const { matchAntisemitismAttacks } = await import('../replyAssistant/antisemitismReplyPlaybook.ts')
    const m = matchAntisemitismAttacks('Hitler was a Rothschild, wake up sheeple')
    assert.ok(m.some((x) => x.id === 'q02-hitler-rothschild'))
  })
})
