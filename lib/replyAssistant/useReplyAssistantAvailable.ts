'use client'

import { useSyncExternalStore } from 'react'
import { isReplyAssistantFeatureEnabled } from '@/lib/siteOpsFeature'
import { nativeWebMcpAvailableAtLoad } from '@/lib/webmcp/nativeAtLoad'

function computeAgentAvailable (): boolean {
  if (typeof window === 'undefined') return false
  if (!isReplyAssistantFeatureEnabled()) return false
  return nativeWebMcpAvailableAtLoad()
}

/** True when WebMCP is enabled and native agent API existed before polyfill. */
export function isReplyAssistantAgentAvailable (): boolean {
  return computeAgentAvailable()
}

function subscribe (): () => void {
  return () => {}
}

export function useReplyAssistantAvailable (): boolean {
  return useSyncExternalStore(subscribe, computeAgentAvailable, () => false)
}
