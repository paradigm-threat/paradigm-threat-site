import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  detectBrowserAiSupport,
  shouldShowBrowserAiLauncher,
} from './detectBrowserAiSupport.ts'
import { isMobileClient } from './isMobileClient.ts'

describe('isMobileClient', () => {
  afterEach(() => {
    delete (globalThis as { navigator?: Navigator }).navigator
  })

  it('detects mobile user agents', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 },
    })
    assert.equal(isMobileClient(), true)
  })

  it('allows desktop Chrome user agents', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/146.0.0.0', platform: 'Linux x86_64', maxTouchPoints: 0 },
    })
    assert.equal(isMobileClient(), false)
  })
})

describe('shouldShowBrowserAiLauncher', () => {
  it('shows for ready and needs-setup', () => {
    assert.equal(shouldShowBrowserAiLauncher({ status: 'ready' }), true)
    assert.equal(shouldShowBrowserAiLauncher({ status: 'needs-setup', reason: 'webmcp-unavailable' }), true)
  })

  it('hides while checking or unsupported', () => {
    assert.equal(shouldShowBrowserAiLauncher({ status: 'checking' }), false)
    assert.equal(shouldShowBrowserAiLauncher({ status: 'unsupported', reason: 'mobile' }), false)
  })
})

describe('detectBrowserAiSupport', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow
    } else {
      delete (globalThis as { window?: Window }).window
    }
    delete (globalThis as { navigator?: Navigator }).navigator
    delete process.env.NEXT_PUBLIC_WEBMCP_ENABLED
  })

  it('returns mobile unsupported without probing APIs', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: 'Mozilla/5.0 (Android 14; Mobile)', platform: 'Linux armv8l', maxTouchPoints: 5 },
    })
    globalThis.window = {} as Window
    const result = await detectBrowserAiSupport()
    assert.deepEqual(result, { status: 'unsupported', reason: 'mobile' })
  })

  it('returns no-prompt-api when LanguageModel is missing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: 'Chrome/146', platform: 'Linux x86_64', maxTouchPoints: 0 },
    })
    globalThis.window = {} as Window
    const result = await detectBrowserAiSupport()
    assert.deepEqual(result, { status: 'unsupported', reason: 'no-prompt-api' })
  })
})
