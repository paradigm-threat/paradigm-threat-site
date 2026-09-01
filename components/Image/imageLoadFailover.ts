/**
 * Load/failover decisions for OptimizedImage.
 * Hung Relay mirrors often never fire onError; treat timeout, empty src, and
 * placeholder loads as failure so the UI never pulses forever.
 */

/** 1x1 transparent GIF — not a real raster; onLoad must not count as success. */
export const EMPTY_SRC_PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** Hung gateway requests never fire onError — advance after this. */
export const LOAD_TIMEOUT_MS = 4000

export function isPlaceholderSrc (src: string | undefined | null): boolean {
    if (!src) return true
    return src === EMPTY_SRC_PLACEHOLDER || src.startsWith('data:image/gif;base64,')
}

export function rasterLoadSucceeded (img: {
    src: string
    currentSrc?: string
    naturalWidth: number
    naturalHeight: number
}): boolean {
    const src = img.currentSrc || img.src
    if (isPlaceholderSrc(src)) return false
    return img.naturalWidth > 1 || img.naturalHeight > 1
}

export type LoadTimerAction = 'arm' | 'fail-empty' | 'idle'

/** What the hang-timeout effect should do this render. */
export function loadTimerAction (opts: {
    isVisible: boolean
    loadFailed: boolean
    loaded: boolean
    activeSrc: string | undefined
}): LoadTimerAction {
    if (opts.loadFailed) return 'idle'
    if (opts.loaded) return 'idle'
    if (!opts.isVisible) return 'idle'
    if (!opts.activeSrc) return 'fail-empty'
    return 'arm'
}

export function nextLoadAttempt (opts: {
    mirrorIndex: number
    mirrorCount: number
    portraitActive: boolean
}): {
    mirrorIndex: number
    loadFailed: boolean
    disablePortrait: boolean
    bumpAttempt: boolean
} {
    if (opts.portraitActive) {
        return {
            mirrorIndex: opts.mirrorIndex,
            loadFailed: false,
            disablePortrait: true,
            bumpAttempt: true,
        }
    }
    if (opts.mirrorIndex + 1 < opts.mirrorCount) {
        return {
            mirrorIndex: opts.mirrorIndex + 1,
            loadFailed: false,
            disablePortrait: false,
            bumpAttempt: false,
        }
    }
    return {
        mirrorIndex: opts.mirrorIndex,
        loadFailed: true,
        disablePortrait: false,
        bumpAttempt: false,
    }
}

export function retryLoadState (): {
    mirrorIndex: number
    loadFailed: boolean
    disablePortrait: boolean
    bumpAttempt: boolean
} {
    return {
        mirrorIndex: 0,
        loadFailed: false,
        disablePortrait: false,
        bumpAttempt: true,
    }
}
