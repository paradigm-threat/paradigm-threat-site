'use client'

import { useEffect } from 'react'
import { isWebMcpEnabled } from '@/lib/siteOpsFeature'
import { nativeWebMcpAvailableAtLoad } from '@/lib/webmcp/nativeAtLoad'

/**
 * Registers WebMCP tools when NEXT_PUBLIC_WEBMCP_ENABLED=1.
 * Captures native modelContext before polyfill init for reply-assistant gating.
 */
export function WebMcpProvider () {
  useEffect(() => {
    if (!isWebMcpEnabled()) return
    nativeWebMcpAvailableAtLoad()
    void import('@/lib/webmcp/init').then((m) => m.initWebMcp()).catch((err) => {
      console.warn('[WebMcpProvider] init failed:', err)
    })
  }, [])
  return null
}
