'use client'

import { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'

export type ReplyDraftingAvailability = 'checking' | 'available' | 'needs-setup' | 'unavailable'

function mapSupport (support: ReturnType<typeof useBrowserAiSupport>): ReplyDraftingAvailability {
  if (support.status === 'checking') return 'checking'
  if (support.status === 'ready') return 'available'
  if (support.status === 'needs-setup') return 'needs-setup'
  return 'unavailable'
}

export function useReplyDraftingAvailable (): ReplyDraftingAvailability {
  return mapSupport(useBrowserAiSupport())
}

/** True when browser AI is fully ready for drafting. */
export function useReplyAssistantAvailable (): boolean {
  return useReplyDraftingAvailable() === 'available'
}

export { useBrowserAiSupport } from '@/lib/browserAi/useBrowserAiSupport'
