'use client'

import { useReplyDraftingAvailable } from '@/lib/replyAssistant/useReplyDraftingAvailable'

/** True when WebMCP (native or polyfill) and browser Prompt API are both available. */
export function useReplyAssistantAvailable (): boolean {
  return useReplyDraftingAvailable() === 'available'
}

export { useReplyDraftingAvailable, type ReplyDraftingAvailability } from '@/lib/replyAssistant/useReplyDraftingAvailable'
