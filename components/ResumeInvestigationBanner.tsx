'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useBottomChrome } from '@/lib/BottomChromeContext'
import {
  readLastVisit,
  readTtsResume,
  clearLastVisit,
  clearTtsResume,
  normalizeResumePath,
  isExcludedResumeInvestigationTarget,
  isMarkdownHubPath,
  type TtsResumePayload,
} from '@/lib/visitResumeStorage'

/** Pixels: gap between resume bottom edge and top of TTS dock */
const RESUME_STACK_GAP_PX = 12
/** Until ResizeObserver publishes, avoid overlap with collapsed transport row */
const MIN_HUB_TTS_RESERVE_PX = 96

export function ResumeInvestigationBanner() {
  const pathname = usePathname()
  const { isHub, suppressOverlay, ttsDockHeightPx } = useBottomChrome()
  const [last, setLast] = useState<{ path: string; title: string | null } | null>(null)
  const [tts, setTts] = useState<TtsResumePayload | null>(null)
  const [dismissed, setDismissed] = useState(false)
  /** Hide banner when user has scrolled away from the top of the page */
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (!isMarkdownHubPath(pathname)) return
    queueMicrotask(() => {
      setLast(readLastVisit())
      setTts(readTtsResume())
      setDismissed(false)
    })
  }, [pathname])

  useEffect(() => {
    if (!isMarkdownHubPath(pathname)) return
    const root = document.getElementById('site-main-scroll')
    const sync = () => {
      setScrollY(root ? root.scrollTop : window.scrollY)
    }
    sync()
    const target: EventTarget = root ?? window
    target.addEventListener('scroll', sync, { passive: true })
    return () => target.removeEventListener('scroll', sync)
  }, [pathname])

  if (!isMarkdownHubPath(pathname)) return null

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

  if (scrollY > 0) return null

  const playbackHref = tts ? `${tts.path}?resumeTts=1` : ''

  const handleDismiss = () => {
    clearLastVisit()
    clearTtsResume()
    setLast(null)
    setTts(null)
    setDismissed(true)
  }

  const stackAboveTts = isHub && !suppressOverlay
  const reservePx = stackAboveTts
    ? (ttsDockHeightPx > 0 ? ttsDockHeightPx : MIN_HUB_TTS_RESERVE_PX)
    : 0
  const bottomStyle =
    reservePx > 0
      ? {
          bottom: `calc(${reservePx + RESUME_STACK_GAP_PX}px + env(safe-area-inset-bottom, 0px))`,
        }
      : {
          bottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
        }

  return (
    <div
      className="fixed z-50 transition-[bottom] duration-300 ease-out max-md:left-1/2 max-md:w-[min(100%,36rem)] max-md:max-w-[calc(100vw-2rem)] max-md:-translate-x-1/2 max-md:px-2 md:right-8 md:left-auto md:w-max md:max-w-[min(20rem,calc(100vw-4rem))] md:translate-x-0 md:px-0"
      style={bottomStyle}
      role="region"
      aria-label="Resume reading"
    >
      <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-sm text-amber-950 dark:text-amber-100 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-2 p-3 sm:p-3.5 sm:gap-3">
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 md:flex-col md:items-end md:gap-2">
          {showResumePage && last && (
            <Link
              href={last.path}
              className="inline-flex max-w-full items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold px-3 py-2 sm:px-4 transition-colors shadow-sm md:w-fit md:justify-end md:min-w-0 md:max-w-full md:text-right"
            >
              <span className="truncate">
                Resume investigation
                {last.title ? (
                  <span className="font-normal opacity-90 md:max-w-[10rem] md:inline-block md:truncate md:align-bottom md:ml-1.5">
                    — {last.title}
                  </span>
                ) : null}
              </span>
            </Link>
          )}
          {showResumePlayback && tts && (
            <Link
              href={playbackHref}
              className="inline-flex max-w-full items-center justify-center rounded-lg border border-amber-700/30 dark:border-amber-400/40 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 font-semibold px-3 py-2 sm:px-4 transition-colors md:w-fit md:justify-end md:min-w-0 md:max-w-full md:text-right"
            >
              <span className="truncate">
                Resume playback
                {tts.title && tts.path !== last?.path ? (
                  <span className="font-normal opacity-90 md:max-w-[9rem] md:inline-block md:truncate md:align-bottom md:ml-1.5">
                    — {tts.title}
                  </span>
                ) : null}
              </span>
            </Link>
          )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-800/65 ring-1 ring-amber-600/15 bg-amber-100/50 hover:bg-amber-200/70 hover:text-amber-950 hover:ring-amber-500/25 dark:text-amber-100/75 dark:bg-amber-950/50 dark:ring-amber-400/15 dark:hover:bg-amber-800/55 dark:hover:text-amber-50 dark:hover:ring-amber-400/25 transition-colors"
            aria-label="Dismiss resume banner"
            title="Dismiss"
          >
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
