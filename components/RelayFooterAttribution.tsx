'use client'

import React, { useSyncExternalStore } from 'react'
import { remoteRelay } from '@/lib/remoteRelayStore'

export function RelayFooterAttribution() {
  const label = useSyncExternalStore(
    (cb) => remoteRelay.subscribe(cb),
    () => remoteRelay.getSnapshot().serverLabel,
    () => remoteRelay.getSnapshot().serverLabel,
  )

  return (
    <div className="flex flex-col items-center gap-1 text-xs text-slate-400">
      <a
        href="https://relaygateway.net"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        Powered by the Relay Network
      </a>
      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-500">
        server: {label || '—'}
      </span>
    </div>
  )
}
