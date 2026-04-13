'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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

export type HubResumeChromeState = {
  last: { path: string; title: string | null } | null
  tts: TtsResumePayload | null
  showResumePage: boolean
  showResumePlayback: boolean
  playbackHref: string
  dismissed: boolean
  handleDismiss: () => void
}

/**
 * localStorage + scroll state for “Resume investigation” / “Resume playback” on `/` and `/book`.
 */
export function useHubResumeChrome(): HubResumeChromeState {
  const pathname = usePathname()
  const [last, setLast] = useState<{ path: string; title: string | null } | null>(null)
  const [tts, setTts] = useState<TtsResumePayload | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isMarkdownHubPath(pathname)) return
    queueMicrotask(() => {
      setLast(readLastVisit())
      setTts(readTtsResume())
      setDismissed(false)
    })
  }, [pathname])

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

  const playbackHref = tts ? `${tts.path}?resumeTts=1` : ''

  const handleDismiss = () => {
    clearLastVisit()
    clearTtsResume()
    setLast(null)
    setTts(null)
    setDismissed(true)
  }

  return {
    last,
    tts,
    showResumePage,
    showResumePlayback,
    playbackHref,
    dismissed,
    handleDismiss,
  }
}
