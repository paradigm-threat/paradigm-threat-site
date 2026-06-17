'use client'

import { useEffect } from 'react'
import { isWebMcpEnabled } from '@/lib/siteOpsFeature'

/**
 * Registers WebMCP tools when NEXT_PUBLIC_WEBMCP_ENABLED=1.
 * Renders nothing — zero UI impact when disabled or when AI is unavailable.
 */
export function WebMcpProvider () {
  useEffect(() => {
    if (!isWebMcpEnabled()) return
    void import('@/lib/webmcp/init').then((m) => m.initWebMcp()).catch((err) => {
      console.warn('[WebMcpProvider] init failed:', err)
    })
  }, [])
  return null
}
