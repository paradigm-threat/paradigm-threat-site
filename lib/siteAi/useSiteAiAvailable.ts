'use client'

import { useEffect, useState } from 'react'
import { isSiteAiEnabled } from '@/lib/siteOpsFeature'
import { isBrowserLanguageModelAvailable } from '@/lib/replyAssistant/browserLanguageModel'
import { getModelContext } from '@/lib/webmcp/modelContext'

export type SiteAiAvailability = 'checking' | 'available' | 'unavailable'

async function computeSiteAiAvailable (): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!isSiteAiEnabled()) return false

  const { initWebMcp } = await import('@/lib/webmcp/init')
  await initWebMcp()

  if (!getModelContext()) return false
  return isBrowserLanguageModelAvailable()
}

export function useSiteAiAvailable (): SiteAiAvailability {
  const [state, setState] = useState<SiteAiAvailability>('checking')

  useEffect(() => {
    let cancelled = false
    void computeSiteAiAvailable().then((ok) => {
      if (!cancelled) setState(ok ? 'available' : 'unavailable')
    }).catch(() => {
      if (!cancelled) setState('unavailable')
    })
    return () => { cancelled = true }
  }, [])

  return state
}
