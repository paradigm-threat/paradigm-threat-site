'use client'

import { useEffect, useState } from 'react'
import {
  detectBrowserAiSupport,
  type BrowserAiSupport,
} from '@/lib/browserAi/detectBrowserAiSupport'

export type BrowserAiSupportState =
  | { status: 'checking' }
  | BrowserAiSupport

export function useBrowserAiSupport (): BrowserAiSupportState {
  const [state, setState] = useState<BrowserAiSupportState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false
    void detectBrowserAiSupport().then((result) => {
      if (!cancelled) setState(result)
    }).catch(() => {
      if (!cancelled) setState({ status: 'unsupported', reason: 'no-prompt-api' })
    })
    return () => { cancelled = true }
  }, [])

  return state
}
