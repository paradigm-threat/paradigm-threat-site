'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { MinimalBottomChrome } from '@/components/SiteChrome/MinimalBottomChrome'
import { SiteAiChatModal } from '@/components/SiteAi/SiteAiChatModal'
import { shouldShowBrowserAiLauncher } from '@/lib/browserAi/detectBrowserAiSupport'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'
import { getBottomChromeVariant } from '@/lib/siteChrome/bottomChrome'

export { hasArticleTtsDock, isArticleReadRoute } from '@/lib/siteChrome/bottomChrome'

export function SiteAiChrome () {
  const pathname = usePathname() || ''
  const support = useBrowserAiSupport()
  const variant = getBottomChromeVariant(pathname)
  const showMinimalDock = variant === 'minimal' && shouldShowBrowserAiLauncher(support)

  return (
    <>
      <SiteAiChatModal />
      {showMinimalDock && <MinimalBottomChrome />}
    </>
  )
}
