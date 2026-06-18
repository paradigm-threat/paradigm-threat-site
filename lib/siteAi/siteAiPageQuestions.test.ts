import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildSummarizePageQuestion,
  getPageContextQuestions,
  isPageFocusedQuestion,
} from './siteAiPageQuestions.ts'

describe('siteAiPageQuestions', () => {
  it('returns page quick-ask chips', () => {
    assert.ok(getPageContextQuestions('Giants').length >= 3)
  })

  it('builds summarize prompt with path', () => {
    const q = buildSummarizePageQuestion({ title: 'Mud Flood', path: 'history/mudflood/page.md' })
    assert.ok(q.includes('Mud Flood'))
    assert.ok(q.includes('history/mudflood/page.md'))
  })

  it('detects page-focused questions', () => {
    assert.equal(isPageFocusedQuestion('Summarize this page for me'), true)
    assert.equal(isPageFocusedQuestion('What happened to the giants?'), false)
  })
})
