'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AGENT_STALL_ERROR_MESSAGE,
  applyProgressEvent,
  SLOW_MODEL_HINT,
  SLOW_MODEL_HINT_EXTENDED,
  type AgentProgressStep,
  type SiteAiAgentProgress,
} from '@/lib/siteAi/agentProgress'

const SLOW_MS = 4_000
const VERY_SLOW_MS = 20_000
export const STALL_ERROR_MS = 90_000
/** When model download reports 0% with no forward progress. */
export const ZERO_DOWNLOAD_STALL_MS = 45_000

export type UseAgentProgressDisplayOptions = {
  onStalled?: () => void
}

export function useAgentProgressDisplay (options?: UseAgentProgressDisplayOptions) {
  const [steps, setSteps] = useState<AgentProgressStep[]>([])
  const [current, setCurrent] = useState('')
  const [slowHint, setSlowHint] = useState<string | null>(null)
  const [stallError, setStallError] = useState<string | null>(null)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verySlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zeroDownloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastModelLoadedRef = useRef<number | null>(null)
  const onStalledRef = useRef(options?.onStalled)

  useEffect(() => {
    onStalledRef.current = options?.onStalled
  }, [options?.onStalled])

  const clearTimers = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    if (verySlowTimerRef.current) {
      clearTimeout(verySlowTimerRef.current)
      verySlowTimerRef.current = null
    }
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
    if (zeroDownloadTimerRef.current) {
      clearTimeout(zeroDownloadTimerRef.current)
      zeroDownloadTimerRef.current = null
    }
  }, [])

  const fireStall = useCallback(() => {
    setStallError(AGENT_STALL_ERROR_MESSAGE)
    setSlowHint(null)
    onStalledRef.current?.()
  }, [])

  const clearZeroDownloadTimer = useCallback(() => {
    if (zeroDownloadTimerRef.current) {
      clearTimeout(zeroDownloadTimerRef.current)
      zeroDownloadTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    lastModelLoadedRef.current = null
    setSteps([])
    setCurrent('')
    setSlowHint(null)
    setStallError(null)
  }, [clearTimers])

  const armSlowTimers = useCallback(() => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    if (verySlowTimerRef.current) clearTimeout(verySlowTimerRef.current)
    slowTimerRef.current = setTimeout(() => {
      setSlowHint(SLOW_MODEL_HINT)
    }, SLOW_MS)
    verySlowTimerRef.current = setTimeout(() => {
      setSlowHint(SLOW_MODEL_HINT_EXTENDED)
    }, VERY_SLOW_MS)
  }, [])

  const armStallTimer = useCallback(() => {
    if (stallTimerRef.current) return
    stallTimerRef.current = setTimeout(() => {
      fireStall()
    }, STALL_ERROR_MS)
  }, [fireStall])

  const armZeroDownloadTimer = useCallback(() => {
    if (zeroDownloadTimerRef.current) return
    zeroDownloadTimerRef.current = setTimeout(() => {
      fireStall()
    }, ZERO_DOWNLOAD_STALL_MS)
  }, [fireStall])

  const onProgress = useCallback((event: SiteAiAgentProgress) => {
    if (event.phase === 'loading-model') {
      const loaded = event.loaded
      if (loaded != null && loaded > (lastModelLoadedRef.current ?? -0.001)) {
        lastModelLoadedRef.current = loaded
        clearZeroDownloadTimer()
      } else if (loaded == null || loaded < 0.01) {
        armZeroDownloadTimer()
      }
    } else {
      clearZeroDownloadTimer()
    }

    const meaningfulProgress = event.phase !== 'loading-model' ||
      (event.loaded != null && event.loaded > (lastModelLoadedRef.current ?? -0.001))
    if (meaningfulProgress) {
      setSlowHint(null)
      armSlowTimers()
    }
    armStallTimer()
    setSteps((prev) => {
      const { steps: next, current: label } = applyProgressEvent(prev, event)
      setCurrent(label)
      return next
    })
  }, [armSlowTimers, armStallTimer, armZeroDownloadTimer, clearZeroDownloadTimer])

  useEffect(() => () => clearTimers(), [clearTimers])

  return { steps, current, slowHint, stallError, onProgress, reset }
}
