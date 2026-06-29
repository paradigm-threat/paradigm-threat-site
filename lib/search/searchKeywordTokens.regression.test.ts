import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { DEFAULT_SEARCH_CONTENT_FILTERS } from '@/lib/searchIndexFilter'
import { expandSearchKeywords } from '@/lib/replyAssistant/expandKeywords.ts'
import {
  isNoiseSearchKeyword,
  tokenizeForKeywordExpansion,
} from './searchKeywordTokens.ts'

describe('searchKeywordTokens', () => {
  it('flags file extensions and tl;dr labels as noise', () => {
    assert.ok(isNoiseSearchKeyword('jpg'))
    assert.ok(isNoiseSearchKeyword('tl;dr'))
    assert.ok(isNoiseSearchKeyword('TL;DR:'))
    assert.ok(isNoiseSearchKeyword('events'))
    assert.ok(!isNoiseSearchKeyword('demolition'))
    assert.ok(!isNoiseSearchKeyword('forensic'))
  })

  it('tokenize strips punctuation from labels', () => {
    const tokens = tokenizeForKeywordExpansion('Investigation: Richard Gage TL;DR: physics hero.jpg')
    assert.ok(tokens.includes('richard'))
    assert.ok(tokens.includes('physics'))
    assert.ok(!tokens.some((t) => t.includes('tl;dr')))
    assert.ok(!tokens.includes('jpg'))
    assert.ok(!tokens.includes('investigation'))
  })
})

describe('expandSearchKeywords', () => {
  const entries: IndexedPathEntry[] = [
    {
      path: 'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md',
      searchText: 'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md Investigation: Richard Gage TL;DR: controlled demolition physics forensic 9/11 hero.jpg',
    },
    {
      path: 'events/false_flag/investigations/ic911a-911revision-controlled-demolition-investigation.md',
      searchText: 'events/false_flag/investigations/ic911a-911revision-controlled-demolition-investigation.md Investigation: ic911a controlled demolition physics 9/11',
    },
    {
      path: 'events/false_flag/investigations/richard-gage.png',
      searchText: 'events/false_flag/investigations/richard-gage.png',
    },
  ]

  it('excludes path noise, media extensions, and tl;dr from related chips', () => {
    const { related } = expandSearchKeywords(entries, '911 physics', DEFAULT_SEARCH_CONTENT_FILTERS, 20)
    assert.ok(related.length > 0)
    assert.ok(related.some((t) => t.includes('demolition') || t.includes('forensic') || t.includes('controlled')))
    assert.ok(!related.includes('jpg'))
    assert.ok(!related.includes('events'))
    assert.ok(!related.some((t) => t.includes('tl;dr')))
    assert.ok(!related.some((t) => t.endsWith(':')))
  })
})
