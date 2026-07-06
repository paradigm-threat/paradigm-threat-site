import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { DEFAULT_SEARCH_CONTENT_FILTERS } from '@/lib/searchIndexFilter'
import { partitionArticleHits } from './searchEnhancements.ts'
import { rankSearchEntries, scoreSearchEntry } from './searchRankScore.ts'

const hiddenHistoryEntries: IndexedPathEntry[] = [
  {
    path: 'history/chronology/investigations/index-investigations.md',
    searchText:
      'history/chronology/investigations/index-investigations.md Chronology Investigations — Index Article history hidden words',
  },
  {
    path: 'history/chronology/jerusalem/troy_1st_jerusalem.md',
    searchText:
      'history/chronology/jerusalem/troy_1st_jerusalem.md Troy = Yoros = Jerusalem history hidden words',
  },
  {
    path: 'history/chronology/the-hidden-history-of-words-chronologia-forum-reply.md',
    searchText:
      'history/chronology/the-hidden-history-of-words-chronologia-forum-reply.md Chronologia forum reply — Hidden History of Words hidden history words',
  },
  {
    path: 'history/chronology/the-hidden-history-of-words.md',
    searchText:
      'history/chronology/the-hidden-history-of-words.md The Hidden History of Words HiddenHistory LexicalRedation hidden history words',
  },
]

describe('searchRankScore', () => {
  it('ranks exact title match above partial path overlap', () => {
    const query = 'hidden history of words'
    const ranked = rankSearchEntries(hiddenHistoryEntries, query)
    assert.equal(ranked[0]!.path, 'history/chronology/the-hidden-history-of-words.md')
    const mainScore = scoreSearchEntry(hiddenHistoryEntries[3]!, query)
    const indexScore = scoreSearchEntry(hiddenHistoryEntries[0]!, query)
    assert.ok(mainScore > indexScore)
  })

  it('partitionArticleHits puts the titled article first', () => {
    const andHits = hiddenHistoryEntries.filter((e) => e.path.endsWith('.md'))
    const { primary } = partitionArticleHits(
      andHits,
      hiddenHistoryEntries,
      'hidden history of words',
      DEFAULT_SEARCH_CONTENT_FILTERS,
    )
    assert.equal(primary[0]!.path, 'history/chronology/the-hidden-history-of-words.md')
  })
})
