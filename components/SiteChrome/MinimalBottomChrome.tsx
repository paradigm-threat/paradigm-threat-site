'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { SiteAiLauncherButton } from '@/components/SiteAi/SiteAiLauncherButton'
import { useBottomChrome } from '@/lib/BottomChromeContext'

const SCROLL_THRESHOLD = 50

export function MinimalBottomChrome () {
  const [isScrolled, setIsScrolled] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const { setTtsDockHeightPx } = useBottomChrome()

  const onScroll = useCallback(() => {
    setIsScrolled(window.scrollY > SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    queueMicrotask(onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  useEffect(() => {
    const el = dockRef.current
    if (!el) return

    const report = () => {
      const rect = el.getBoundingClientRect()
      const fromBottom = window.innerHeight - rect.top
      setTtsDockHeightPx(fromBottom > 0 ? fromBottom : 0)
    }

    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    window.addEventListener('scroll', report, { passive: true })
    window.addEventListener('resize', report)

    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', report)
      window.removeEventListener('resize', report)
      setTtsDockHeightPx(0)
    }
  }, [setTtsDockHeightPx])

  const scrollToTop = useCallback(() => {
    window.scroll({ top: 0, left: 0, behavior: 'smooth' })
    if (window.location.hash) {
      window.history.pushState({}, document.title, window.location.pathname)
    }
  }, [])

  return (
    <div
      ref={dockRef}
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-end p-3 md:bottom-8 md:right-8 md:left-auto md:p-0 pointer-events-none"
    >
      <div className="pointer-events-auto bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/50 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          {isScrolled && (
            <button
              type="button"
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Back to top"
            >
              <ChevronUp size={20} />
            </button>
          )}
          <SiteAiLauncherButton size="dock" />
        </div>
      </div>
    </div>
  )
}
