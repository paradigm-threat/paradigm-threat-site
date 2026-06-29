import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getBottomChromeVariant,
  hasArticleTtsDock,
  isArticleReadRoute,
  isHubRoute,
  shouldHideLegacyFloatingBackToTop,
} from './bottomChrome.ts'

describe('bottomChrome', () => {
  it('article routes use article-tts variant', () => {
    assert.equal(getBottomChromeVariant('/history/chronology/foo'), 'article-tts')
    assert.equal(isArticleReadRoute('/science/computing/bar'), true)
    assert.equal(hasArticleTtsDock('/science/computing/bar'), true)
  })

  it('markdown hubs use article-tts (ArticleTTSOverlay); tool pages use minimal', () => {
    assert.equal(getBottomChromeVariant('/'), 'article-tts')
    assert.equal(getBottomChromeVariant('/book'), 'article-tts')
    assert.equal(getBottomChromeVariant('/reply'), 'minimal')
    assert.equal(getBottomChromeVariant('/chat'), 'minimal')
    assert.equal(getBottomChromeVariant('/timeline'), 'minimal')
    assert.equal(getBottomChromeVariant('/search'), 'minimal')
    assert.equal(isHubRoute('/'), true)
    assert.equal(isHubRoute('/reply'), false)
  })

  it('hides legacy FloatingDiv back-to-top on all main routes', () => {
    assert.equal(shouldHideLegacyFloatingBackToTop('/reply'), true)
    assert.equal(shouldHideLegacyFloatingBackToTop('/'), true)
    assert.equal(shouldHideLegacyFloatingBackToTop('/history/foo/bar'), true)
  })
})
