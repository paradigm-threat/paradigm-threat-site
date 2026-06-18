'use client'

import { useEffect, useState } from 'react'
import { isReplyAssistantFeatureEnabled } from '@/lib/siteOpsFeature'
import { isBrowserLanguageModelAvailable } from '@/lib/replyAssistant/browserLanguageModel'
import { getModelContext } from '@/lib/webmcp/modelContext'

export type ReplyDraftingAvailability = 'checking' | 'available' | 'unavailable'

async function computeReplyDraftingAvailable (): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!isReplyAssistantFeatureEnabled()) return false

  const { initWebMcp } = await import('@/lib/webmcp/init')
  await initWebMcp()

  if (!getModelContext()) return false
  return isBrowserLanguageModelAvailable()
}

export function useReplyDraftingAvailable (): ReplyDraftingAvailability {
  const [state, setState] = useState<ReplyDraftingAvailability>('checking')

  useEffect(() => {
    let cancelled = false
    void computeReplyDraftingAvailable().then((ok) => {
      if (!cancelled) setState(ok ? 'available' : 'unavailable')
    }).catch(() => {
      if (!cancelled) setState('unavailable')
    })
    return () => { cancelled = true }
  }, [])

  return state
}
