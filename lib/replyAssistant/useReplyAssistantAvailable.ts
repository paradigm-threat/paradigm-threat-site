'use client'

import { useReplyDraftingAvailable } from '@/lib/replyAssistant/useReplyDraftingAvailable'

/** @deprecated Use useReplyDraftingAvailable or useBrowserAiSupport directly. */
export function useReplyAssistantAvailable (): boolean {
  return useReplyDraftingAvailable() === 'available'
}

export {
  useReplyDraftingAvailable,
  type ReplyDraftingAvailability,
} from '@/lib/replyAssistant/useReplyDraftingAvailable'
