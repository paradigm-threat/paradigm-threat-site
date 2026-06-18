'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { SiteAiChatModal } from '@/components/SiteAi/SiteAiChatModal'
import { SiteAiLauncherButton } from '@/components/SiteAi/SiteAiLauncherButton'
import { shouldShowBrowserAiLauncher } from '@/lib/browserAi/detectBrowserAiSupport'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'
import { isMarkdownHubPath } from '@/lib/visitResumeStorage'

/** Article routes that already show the AI button in the TTS dock. */
export function hasArticleTtsDock (pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length >= 2 || isMarkdownHubPath(pathname)
}

export function SiteAiChrome () {
  const pathname = usePathname() || ''
  const support = useBrowserAiSupport()
  const showGlobalFab = shouldShowBrowserAiLauncher(support) && !hasArticleTtsDock(pathname)

  return (
    <>
      <SiteAiChatModal />
      {showGlobalFab && (
        <div className="fixed bottom-8 right-8 z-[120] md:right-8">
          <SiteAiLauncherButton size="fab" />
        </div>
      )}
    </>
  )
}
