'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { usePathname } from 'next/navigation'
import { isMarkdownHubPath } from '@/lib/visitResumeStorage'
import { isThirdStoryLandingHost } from '@/lib/thirdStoryLanding'

export type BottomChromeContextValue = {
  /** `/` or `/book` */
  isHub: boolean
  /** thirdstory.site-style landing: omit TTS overlay */
  suppressOverlay: boolean
  /** ArticleTTSOverlay (or equivalent) is mounted — hide MinimalBottomChrome */
  articleTtsDockActive: boolean
  registerArticleTtsDock: () => void
  unregisterArticleTtsDock: () => void
  /**
   * Pixels from the viewport bottom to the top edge of the TTS dock (fixed overlay).
   * Updated via ResizeObserver on the dock.
   */
  ttsDockHeightPx: number
  setTtsDockHeightPx: (px: number) => void
}

const BottomChromeContext = createContext<BottomChromeContextValue | null>(null)

const noop = () => {}

function subscribeThirdStoryLanding(_onStoreChange: () => void) {
  return () => {}
}

function getThirdStoryLandingSnapshot() {
  return isThirdStoryLandingHost()
}

function getThirdStoryLandingServerSnapshot() {
  return false
}

export function BottomChromeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const [ttsDockHeightPx, setTtsDockHeightPxState] = useState(0)
  const [articleTtsDockCount, setArticleTtsDockCount] = useState(0)

  const thirdLanding = useSyncExternalStore(
    subscribeThirdStoryLanding,
    getThirdStoryLandingSnapshot,
    getThirdStoryLandingServerSnapshot,
  )

  const isHub = isMarkdownHubPath(pathname)

  const setTtsDockHeightPx = useCallback((px: number) => {
    setTtsDockHeightPxState(Math.max(0, Math.ceil(px)))
  }, [])

  const registerArticleTtsDock = useCallback(() => {
    setArticleTtsDockCount((n) => n + 1)
  }, [])

  const unregisterArticleTtsDock = useCallback(() => {
    setArticleTtsDockCount((n) => Math.max(0, n - 1))
  }, [])

  const suppressOverlay = thirdLanding
  const articleTtsDockActive = articleTtsDockCount > 0

  const value = useMemo(
    () => ({
      isHub,
      suppressOverlay,
      articleTtsDockActive,
      registerArticleTtsDock,
      unregisterArticleTtsDock,
      ttsDockHeightPx,
      setTtsDockHeightPx,
    }),
    [
      isHub,
      suppressOverlay,
      articleTtsDockActive,
      registerArticleTtsDock,
      unregisterArticleTtsDock,
      ttsDockHeightPx,
      setTtsDockHeightPx,
    ],
  )

  return <BottomChromeContext.Provider value={value}>{children}</BottomChromeContext.Provider>
}

export function useBottomChrome(): BottomChromeContextValue {
  const ctx = useContext(BottomChromeContext)
  if (!ctx) {
    return {
      isHub: false,
      suppressOverlay: false,
      articleTtsDockActive: false,
      registerArticleTtsDock: noop,
      unregisterArticleTtsDock: noop,
      ttsDockHeightPx: 0,
      setTtsDockHeightPx: noop,
    }
  }
  return ctx
}
