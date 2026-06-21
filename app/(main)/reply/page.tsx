'use client'

import { ReplyAssistant } from '@/components/ReplyAssistant/ReplyAssistant'
import { BrowserAiSetupPanel } from '@/components/SiteAi/BrowserAiSetupPanel'
import { isReplyAssistantFeatureEnabled } from '@/lib/siteOpsFeature'

export default function ReplyPage () {
  if (!isReplyAssistantFeatureEnabled()) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4">
        <header className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reply assistant</h1>
        </header>
        <div className="rounded-xl border border-violet-500/30 bg-slate-900/40 p-4">
          <BrowserAiSetupPanel reason="feature-disabled" variant="page" />
        </div>
      </div>
    )
  }
  return <ReplyAssistant />
}
