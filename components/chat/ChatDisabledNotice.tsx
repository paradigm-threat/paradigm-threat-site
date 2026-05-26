import React from 'react'
import { MessageSquare } from 'lucide-react'
import {
  CHAT_DISABLED_BODY,
  CHAT_DISABLED_HEADLINE,
} from '@/lib/siteOpsMessages'

/** Overlay banner shown on top of ChatRoom when chat ops flag is active. */
export function ChatDisabledNotice () {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-slate-950/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-amber-200/90 bg-amber-50/95 px-5 py-4 text-center shadow-lg dark:border-amber-900/50 dark:bg-amber-950/90">
        <MessageSquare
          size={36}
          className="mx-auto text-amber-600/90 dark:text-amber-500/90"
          aria-hidden
        />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {CHAT_DISABLED_HEADLINE}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {CHAT_DISABLED_BODY}
        </p>
      </div>
    </div>
  )
}
