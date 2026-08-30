import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  EMPTY_SRC_PLACEHOLDER,
  LOAD_TIMEOUT_MS,
  isPlaceholderSrc,
  loadTimerAction,
  nextLoadAttempt,
  rasterLoadSucceeded,
  retryLoadState,
} from './imageLoadFailover.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const optimizedSrc = readFileSync(join(root, 'components/Image/OptimizedImage.tsx'), 'utf8')

describe('imageLoadFailover', () => {
  it('treats empty src and the 1x1 GIF as placeholders', () => {
    assert.equal(isPlaceholderSrc(''), true)
    assert.equal(isPlaceholderSrc(undefined), true)
    assert.equal(isPlaceholderSrc(EMPTY_SRC_PLACEHOLDER), true)
    assert.equal(
      isPlaceholderSrc('https://paradigm-threat-files.iad1.relaygateway.net/cosmos/foo.png?w=800'),
      false,
    )
  })

  it('does not count placeholder onLoad as a successful raster', () => {
    assert.equal(
      rasterLoadSucceeded({
        src: EMPTY_SRC_PLACEHOLDER,
        currentSrc: EMPTY_SRC_PLACEHOLDER,
        naturalWidth: 1,
        naturalHeight: 1,
      }),
      false,
    )
    assert.equal(
      rasterLoadSucceeded({
        src: 'https://paradigm-threat-files.iad1.relaygateway.net/cosmos/foo.png?w=800',
        currentSrc: 'https://paradigm-threat-files.iad1.relaygateway.net/cosmos/foo.png?w=800',
        naturalWidth: 800,
        naturalHeight: 1200,
      }),
      true,
    )
  })

  it('timeout path: visible + src → arm; empty activeSrc → fail-empty (error UI)', () => {
    assert.equal(
      loadTimerAction({
        isVisible: true,
        loadFailed: false,
        activeSrc: 'https://example.relaygateway.net/a.png?w=800',
      }),
      'arm',
    )
    assert.equal(
      loadTimerAction({ isVisible: true, loadFailed: false, activeSrc: undefined }),
      'fail-empty',
    )
    assert.equal(
      loadTimerAction({
        isVisible: false,
        loadFailed: false,
        activeSrc: 'https://example.relaygateway.net/a.png?w=800',
      }),
      'idle',
    )
    assert.equal(
      loadTimerAction({
        isVisible: true,
        loadFailed: true,
        activeSrc: 'https://example.relaygateway.net/a.png?w=800',
      }),
      'idle',
    )
    assert.ok(LOAD_TIMEOUT_MS > 0)
    assert.ok(LOAD_TIMEOUT_MS <= 12_000)
  })

  it('mirror exhaustion → loadFailed; middle mirrors advance', () => {
    assert.deepEqual(nextLoadAttempt({ mirrorIndex: 0, mirrorCount: 1, portraitActive: false }), {
      mirrorIndex: 0,
      loadFailed: true,
      disablePortrait: false,
      bumpAttempt: false,
    })
    assert.deepEqual(nextLoadAttempt({ mirrorIndex: 0, mirrorCount: 3, portraitActive: false }), {
      mirrorIndex: 1,
      loadFailed: false,
      disablePortrait: false,
      bumpAttempt: false,
    })
    assert.deepEqual(nextLoadAttempt({ mirrorIndex: 2, mirrorCount: 3, portraitActive: false }), {
      mirrorIndex: 2,
      loadFailed: true,
      disablePortrait: false,
      bumpAttempt: false,
    })
    assert.deepEqual(nextLoadAttempt({ mirrorIndex: 0, mirrorCount: 0, portraitActive: false }), {
      mirrorIndex: 0,
      loadFailed: true,
      disablePortrait: false,
      bumpAttempt: false,
    })
  })

  it('portrait failure retries same mirror as landscape before exhausting', () => {
    assert.deepEqual(nextLoadAttempt({ mirrorIndex: 0, mirrorCount: 1, portraitActive: true }), {
      mirrorIndex: 0,
      loadFailed: false,
      disablePortrait: true,
      bumpAttempt: true,
    })
  })

  it('retry resets mirror index and loadFailed', () => {
    assert.deepEqual(retryLoadState(), {
      mirrorIndex: 0,
      loadFailed: false,
      disablePortrait: false,
      bumpAttempt: true,
    })
  })
})

describe('OptimizedImage wiring', () => {
  it('uses failover helpers so timeout / empty src / placeholder cannot stall', () => {
    assert.match(optimizedSrc, /loadTimerAction/)
    assert.match(optimizedSrc, /fail-empty/)
    assert.match(optimizedSrc, /rasterLoadSucceeded/)
    assert.match(optimizedSrc, /isPlaceholderSrc/)
    assert.match(optimizedSrc, /nextLoadAttempt/)
    assert.match(optimizedSrc, /retryLoadState/)
    assert.match(optimizedSrc, /LOAD_TIMEOUT_MS/)
    assert.match(optimizedSrc, /Image failed to load from Relay mirrors/)
    assert.match(optimizedSrc, />\s*Retry\s*</)
    assert.match(optimizedSrc, /role="alert"/)
  })

  it('keeps IntersectionObserver on a stable container (key remounts picture/img only)', () => {
    assert.match(optimizedSrc, /ref=\{containerRef\}/)
    assert.doesNotMatch(
      optimizedSrc,
      /ref=\{containerRef\}[\s\S]{0,120}key=\{imageIntrinsicKey\}/,
    )
    assert.match(optimizedSrc, /<picture key=\{imageIntrinsicKey\}>/)
    assert.match(optimizedSrc, /site-main-scroll/)
  })

  it('does not mount a placeholder img src that can clear the hang timer', () => {
    assert.doesNotMatch(optimizedSrc, /src=\{displaySrc\}/)
    assert.match(optimizedSrc, /src=\{activeSrc\}/)
    assert.match(optimizedSrc, /loading=\{priority \|\| isVisible \? 'eager' : 'lazy'\}/)
  })
})
