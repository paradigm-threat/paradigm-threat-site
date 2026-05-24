import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  isSearchDisabled,
  isSearchServerApiDisabled,
  isChatDisabled,
  isServerRelayFetchDisabled,
  isSsrMirrorRedirectEnabled,
} from './siteOpsFeature.ts'
import {
  shouldRedirectPathToFilesMirror,
  sitePathToMirrorHtmlRel,
} from './ssrMirrorRedirect.ts'

describe('siteOpsFeature flags', () => {
  const prev = {
    search: process.env.NEXT_PUBLIC_SEARCH_DISABLED,
    chat: process.env.NEXT_PUBLIC_CHAT_DISABLED,
    ssr: process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT,
    relay: process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH,
  }

  afterEach(() => {
    if (prev.search === undefined) delete process.env.NEXT_PUBLIC_SEARCH_DISABLED
    else process.env.NEXT_PUBLIC_SEARCH_DISABLED = prev.search
    if (prev.chat === undefined) delete process.env.NEXT_PUBLIC_CHAT_DISABLED
    else process.env.NEXT_PUBLIC_CHAT_DISABLED = prev.chat
    if (prev.ssr === undefined) delete process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT
    else process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT = prev.ssr
    if (prev.relay === undefined) delete process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH
    else process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH = prev.relay
  })

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SEARCH_DISABLED
    delete process.env.NEXT_PUBLIC_CHAT_DISABLED
    delete process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT
    delete process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH
  })

  it('flags default off except server relay fetch', () => {
    assert.equal(isSearchDisabled(), false)
    assert.equal(isSearchServerApiDisabled(), false)
    assert.equal(isChatDisabled(), false)
    assert.equal(isServerRelayFetchDisabled(), true)
    assert.equal(isSsrMirrorRedirectEnabled(), false)
  })

  it('server relay fetch on when env is 1', () => {
    process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH = '1'
    assert.equal(isServerRelayFetchDisabled(), false)
  })

  it('flags on when env is 1', () => {
    process.env.NEXT_PUBLIC_SEARCH_DISABLED = '1'
    process.env.NEXT_PUBLIC_CHAT_DISABLED = '1'
    process.env.NEXT_PUBLIC_SSR_MIRROR_REDIRECT = '1'
    assert.equal(isSearchServerApiDisabled(), true)
    assert.equal(isSearchDisabled(), true)
    assert.equal(isChatDisabled(), true)
    assert.equal(isSsrMirrorRedirectEnabled(), false)
  })
})

describe('sitePathToMirrorHtmlRel', () => {
  it('maps extensionless slugs to .md', () => {
    assert.equal(
      sitePathToMirrorHtmlRel(
        '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation',
      ),
      'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md',
    )
  })
})

describe('shouldRedirectPathToFilesMirror', () => {
  it('redirects article paths and root', () => {
    assert.equal(shouldRedirectPathToFilesMirror('/'), true)
    assert.equal(shouldRedirectPathToFilesMirror('/history/foo/bar'), true)
  })

  it('excludes app routes and static assets', () => {
    assert.equal(shouldRedirectPathToFilesMirror('/timeline/evt-x'), false)
    assert.equal(shouldRedirectPathToFilesMirror('/search'), false)
    assert.equal(shouldRedirectPathToFilesMirror('/chat/general'), false)
    assert.equal(shouldRedirectPathToFilesMirror('/api/foo'), false)
    assert.equal(shouldRedirectPathToFilesMirror('/history/x.png'), false)
    assert.equal(shouldRedirectPathToFilesMirror('/hooks/foo.cs'), false)
  })
})
