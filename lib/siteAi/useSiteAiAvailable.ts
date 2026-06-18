'use client'

import { useBrowserAiSupport, type BrowserAiSupportState } from '@/lib/browserAi/useBrowserAiSupport'

export type SiteAiAvailability = 'checking' | 'available' | 'needs-setup' | 'unavailable'

function mapSupport (support: BrowserAiSupportState): SiteAiAvailability {
  if (support.status === 'checking') return 'checking'
  if (support.status === 'ready') return 'available'
  if (support.status === 'needs-setup') return 'needs-setup'
  return 'unavailable'
}

export function useSiteAiAvailable (): SiteAiAvailability {
  return mapSupport(useBrowserAiSupport())
}

export { useBrowserAiSupport, type BrowserAiSupportState } from '@/lib/browserAi/useBrowserAiSupport'
export { shouldShowBrowserAiLauncher } from '@/lib/browserAi/detectBrowserAiSupport'
