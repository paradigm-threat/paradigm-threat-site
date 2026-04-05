'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  readLastVisit,
  readTtsResume,
  clearLastVisit,
  clearTtsResume,
  normalizeResumePath,
  isExcludedResumeInvestigationTarget,
  type TtsResumePayload,
} from '@/lib/visitResumeStorage'

const SCROLL_THRESHOLD = 100

function isHomeHub(pathname: string | null): boolean {
  if (!pathname) return false
  const p = normalizeResumePath(pathname)
  return p === '/' || p === '/book'
}

export function ResumeInvestigationBanner() {
  const pathname = usePathname()
  const [last, setLast] = useState<{ path: string; title: string | null } | null>(null)
  const [tts, setTts] = useState<TtsResumePayload | null>(null)
  const [isScrolledDown, setIsScrolledDown] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isHomeHub(pathname)) return
    queueMicrotask(() => {
      setLast(readLastVisit())
      setTts(readTtsResume())
      setDismissed(false)
    })
  }, [pathname])

  useEffect(() => {
    if (!isHomeHub(pathname)) return

    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > SCROLL_THRESHOLD)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  if (!isHomeHub(pathname)) return null

  const showResumePage = Boolean(
    last?.path &&
    !isExcludedResumeInvestigationTarget(last.path) &&
    normalizeResumePath(last.path) !== normalizeResumePath(pathname || ''),
  )
  const showResumePlayback = Boolean(
    tts?.path &&
    tts.sentenceIndex >= 0 &&
    !isExcludedResumeInvestigationTarget(tts.path),
  )

  if (!showResumePage && !showResumePlayback) return null

  if (dismissed) return null

  const playbackHref = tts ? `${tts.path}?resumeTts=1` : ''

  const handleDismiss = () => {
    clearLastVisit()
    clearTtsResume()
    setLast(null)
    setTts(null)
    setDismissed(true)
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out"
      style={{
        opacity: isScrolledDown ? 0 : 1,
        pointerEvents: isScrolledDown ? 'none' : 'auto',
        transform: isScrolledDown ? 'translateX(-50%) translateY(20px)' : 'translateX(-50%) translateY(0)',
      }}
      role="region"
      aria-label="Resume reading"
    >
      <div
        className="relative rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 shadow-lg backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-[-0.8em] right-[-0.8em] inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-500/45 bg-amber-100/85 text-amber-900 shadow-sm hover:bg-amber-200 dark:border-amber-300/35 dark:bg-amber-900/75 dark:text-amber-100 dark:hover:bg-amber-800"
          aria-label="Dismiss resume banner"
          title="Dismiss"
        >
          X
        </button>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          {showResumePage && last && (
            <Link
              href={last.path}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold px-4 py-2 transition-colors shadow-sm"
            >
              Resume investigation
              {last.title ? (
                <span className="font-normal opacity-90 truncate max-w-[min(100%,14rem)] sm:max-w-[18rem] ml-1.5">
                  — {last.title}
                </span>
              ) : null}
            </Link>
          )}
          {showResumePlayback && tts && (
            <Link
              href={playbackHref}
              className="inline-flex items-center justify-center rounded-lg border border-amber-700/30 dark:border-amber-400/40 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 font-semibold px-4 py-2 transition-colors"
            >
              Resume playback
              {tts.title && tts.path !== last?.path ? (
                <span className="font-normal opacity-90 truncate max-w-[min(100%,12rem)] sm:max-w-[16rem] ml-1.5">
                  — {tts.title}
                </span>
              ) : null}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
