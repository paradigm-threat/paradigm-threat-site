import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  channelPathPrefix,
  commentFilePath,
  encodeChatChannel,
} from './chatPath.ts'
import {
  displayUsername,
  parseChatMarkdown,
  serializeChatComment,
} from './chatMarkdown.ts'
import { chatRelayOriginFromFilesOrigin, CHAT_RELAY_BRANCH } from './chatRelayOrigin.ts'

describe('chatPath', () => {
  it('encodes slash in channel names', () => {
    assert.match(encodeChatChannel('cosmos/mars'), /cosmos/)
    assert.match(encodeChatChannel('cosmos/mars'), /mars/)
  })

  it('builds stable channel prefix', () => {
    assert.equal(channelPathPrefix('general'), '.relay/chat/channels/general/')
  })

  it('comment filename sorts chronologically', () => {
    const a = commentFilePath('general', new Date('2024-01-01T00:00:00Z'), 1, 'AAA')
    const b = commentFilePath('general', new Date('2025-01-01T00:00:00Z'), 2, 'BBB')
    assert.ok(a < b)
  })
})

describe('chatMarkdown', () => {
  it('round-trips anonymous comment', () => {
    const raw = serializeChatComment({
      schema: 'paradigm.chat.v1',
      id: 'abc',
      channel: 'general',
      anonymous: true,
      created: '2024-03-15T12:00:00.000Z',
      source: 'web',
      signed: false,
      content: 'hello world',
    })
    const parsed = parseChatMarkdown(raw)
    assert.ok(parsed)
    assert.equal(parsed.anonymous, true)
    assert.equal(displayUsername(parsed), 'anonymous')
    assert.equal(parsed.content, 'hello world')
  })

  it('parses YAML date timestamps from Relay files', () => {
    const raw = `---
schema: paradigm.chat.v1
id: SEED00001
channel: general
author: relay-bootstrap
anonymous: false
created: 2026-07-13T14:00:00.000Z
source: web
signed: false
---
Bootstrap message`
    const parsed = parseChatMarkdown(raw)
    assert.ok(parsed)
    assert.equal(parsed.created, '2026-07-13T14:00:00.000Z')
    assert.equal(parsed.content, 'Bootstrap message')
  })
})

describe('chatRelayOrigin', () => {
  it('derives site repo host from files mirror', () => {
    const origin = chatRelayOriginFromFilesOrigin('https://paradigm-threat-files.dfw1.relaygateway.net')
    assert.equal(origin, 'https://paradigm-threat-site.dfw1.relaygateway.net')
    assert.equal(CHAT_RELAY_BRANCH, 'chat/public')
  })
})
