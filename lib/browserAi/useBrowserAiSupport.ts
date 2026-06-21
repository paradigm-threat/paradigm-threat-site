'use client'

import { useBrowserAiSupportContext } from '@/components/SiteAi/BrowserAiSupportProvider'
import type { BrowserAiSupportState } from '@/components/SiteAi/BrowserAiSupportProvider'

export type { BrowserAiSupportState } from '@/components/SiteAi/BrowserAiSupportProvider'

export function useBrowserAiSupport (): BrowserAiSupportState {
  return useBrowserAiSupportContext().support
}
