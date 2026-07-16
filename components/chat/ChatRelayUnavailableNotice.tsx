import React from 'react'
import { WifiOff } from 'lucide-react'

/** Shown when Relay chat mirrors are unreachable. */
export function ChatRelayUnavailableNotice ({ message }: { message?: string }) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-slate-950/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-slate-200/90 bg-white/95 px-5 py-4 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
        <WifiOff
          size={36}
          className="mx-auto text-slate-500"
          aria-hidden
        />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Chat temporarily unavailable
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {message || 'Relay chat mirrors are offline. Try again in a moment or pick another node in site settings.'}
        </p>
      </div>
    </div>
  )
}
