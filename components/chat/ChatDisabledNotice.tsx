import React from 'react'
import { MessageSquare } from 'lucide-react'
import {
  CHAT_DISABLED_BODY,
  CHAT_DISABLED_HEADLINE,
} from '@/lib/siteOpsMessages'

export function ChatDisabledNotice () {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full rounded-3xl border-2 border-amber-200/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 p-10 text-center space-y-4">
        <MessageSquare
          size={48}
          className="mx-auto text-amber-600/80 dark:text-amber-500/80"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {CHAT_DISABLED_HEADLINE}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {CHAT_DISABLED_BODY}
        </p>
      </div>
    </div>
  )
}
