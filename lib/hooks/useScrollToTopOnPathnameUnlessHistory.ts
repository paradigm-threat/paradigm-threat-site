'use client'

import { useEffect, useRef } from 'react'

/**
 * Scroll to top when `pathname` changes from in-app navigation.
 * Skips once after browser back/forward (`popstate`) so scroll position can restore.
 */
export function useScrollToTopOnPathnameUnlessHistory (pathname: string | null): void {
  const fromHistory = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (pathname == null) return
    if (fromHistory.current) {
      fromHistory.current = false
      return
    }
    const main = document.getElementById('site-main-scroll')
    main?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [pathname])
}
