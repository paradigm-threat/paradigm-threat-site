'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { useSiteAi } from '@/components/SiteAi/SiteAiProvider'
import { shouldShowBrowserAiLauncher } from '@/lib/browserAi/detectBrowserAiSupport'
import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'

type SiteAiLauncherButtonProps = {
  className?: string
  size?: 'dock' | 'fab'
  ariaLabel?: string
}

export function SiteAiLauncherButton ({
  className = '',
  size = 'dock',
  ariaLabel = 'Ask site AI',
}: SiteAiLauncherButtonProps) {
  const support = useBrowserAiSupport()
  const { openModal } = useSiteAi()

  if (!shouldShowBrowserAiLauncher(support)) return null

  const sizeClass = size === 'fab'
    ? 'w-14 h-14'
    : 'w-12 h-12'

  return (
    <button
      type="button"
      onClick={openModal}
      className={`${sizeClass} rounded-full bg-violet-600/90 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 ${className}`.trim()}
      aria-label={ariaLabel}
      title="Ask about this site (on-device AI)"
    >
      <Sparkles size={size === 'fab' ? 24 : 20} />
    </button>
  )
}
