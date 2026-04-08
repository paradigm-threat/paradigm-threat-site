'use client'

import { useBottomChrome } from '@/lib/BottomChromeContext'

/**
 * Hub TTS chrome: third-story landing suppresses overlay entirely.
 * Resume stacks above the dock via BottomChromeContext + ResizeObserver on the overlay.
 */
export function useMobileHubTtsChrome() {
  const { suppressOverlay } = useBottomChrome()
  return { suppressOverlay }
}
