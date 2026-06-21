'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  detectBrowserAiSupport,
  type BrowserAiSupport,
} from '@/lib/browserAi/detectBrowserAiSupport'

export type BrowserAiSupportState =
  | { status: 'checking' }
  | BrowserAiSupport

type BrowserAiSupportContextValue = {
  support: BrowserAiSupportState
  refresh: () => void
}

const BrowserAiSupportContext = createContext<BrowserAiSupportContextValue | null>(null)

export function BrowserAiSupportProvider ({ children }: { children: React.ReactNode }) {
  const [support, setSupport] = useState<BrowserAiSupportState>({ status: 'checking' })
  const [probeId, setProbeId] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (probeId > 0) {
      queueMicrotask(() => {
        if (!cancelled) setSupport({ status: 'checking' })
      })
    }
    void detectBrowserAiSupport().then((result) => {
      if (!cancelled) setSupport(result)
    }).catch(() => {
      if (!cancelled) setSupport({ status: 'unsupported', reason: 'no-prompt-api' })
    })
    return () => { cancelled = true }
  }, [probeId])

  const value = useMemo<BrowserAiSupportContextValue>(() => ({
    support,
    refresh: () => setProbeId((n) => n + 1),
  }), [support])

  return (
    <BrowserAiSupportContext.Provider value={value}>
      {children}
    </BrowserAiSupportContext.Provider>
  )
}

export function useBrowserAiSupportContext (): BrowserAiSupportContextValue {
  const ctx = useContext(BrowserAiSupportContext)
  if (!ctx) {
    throw new Error('useBrowserAiSupportContext must be used within BrowserAiSupportProvider')
  }
  return ctx
}
