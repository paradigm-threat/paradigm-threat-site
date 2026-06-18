'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyProgressEvent,
  SLOW_MODEL_HINT,
  SLOW_MODEL_HINT_EXTENDED,
  type AgentProgressStep,
  type SiteAiAgentProgress,
} from '@/lib/siteAi/agentProgress'

const SLOW_MS = 4_000
const VERY_SLOW_MS = 20_000

export function useAgentProgressDisplay () {
  const [steps, setSteps] = useState<AgentProgressStep[]>([])
  const [current, setCurrent] = useState('')
  const [slowHint, setSlowHint] = useState<string | null>(null)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verySlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    if (verySlowTimerRef.current) {
      clearTimeout(verySlowTimerRef.current)
      verySlowTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setSteps([])
    setCurrent('')
    setSlowHint(null)
  }, [clearTimers])

  const armSlowTimers = useCallback(() => {
    clearTimers()
    slowTimerRef.current = setTimeout(() => {
      setSlowHint(SLOW_MODEL_HINT)
    }, SLOW_MS)
    verySlowTimerRef.current = setTimeout(() => {
      setSlowHint(SLOW_MODEL_HINT_EXTENDED)
    }, VERY_SLOW_MS)
  }, [clearTimers])

  const onProgress = useCallback((event: SiteAiAgentProgress) => {
    setSlowHint(null)
    armSlowTimers()
    setSteps((prev) => {
      const { steps: next, current: label } = applyProgressEvent(prev, event)
      setCurrent(label)
      return next
    })
  }, [armSlowTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  return { steps, current, slowHint, onProgress, reset }
}
