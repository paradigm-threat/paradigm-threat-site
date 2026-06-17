import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isTimelineSearchEntry,
  searchEntryHref,
  searchEntryTitle,
} from './searchEntryDisplay.ts'

describe('searchEntryDisplay', () => {
  it('detects timeline index paths', () => {
    assert.equal(isTimelineSearchEntry('timeline/evt-introduction'), true)
    assert.equal(isTimelineSearchEntry('history/foo.md'), false)
  })

  it('uses event title from timeline searchText', () => {
    const entry = {
      path: 'timeline/evt-mudflood',
      searchText: 'evt-mudflood Mud Flood Theory debunk/mudflood.md mud flood',
    }
    assert.match(searchEntryTitle(entry), /Mud Flood/i)
    assert.equal(searchEntryHref(entry.path), '/timeline/evt-mudflood')
  })

  it('uses file title from searchText when present', () => {
    const entry = {
      path: 'debunk/mud-flood.md',
      searchText: 'debunk/mud-flood.md Mud Flood Evidence tartaria',
    }
    assert.match(searchEntryTitle(entry), /Mud Flood Evidence/i)
    assert.equal(searchEntryHref(entry.path), '/debunk/mud-flood')
  })
})
