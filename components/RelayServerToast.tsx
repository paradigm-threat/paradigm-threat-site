'use client'

import React, { useEffect, useState } from 'react'
import { remoteRelay, type RelayNotifyEvent } from '@/lib/remoteRelayStore'

const TOAST_MS = 5500

export function RelayServerToast() {
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null)

  useEffect(() => {
    return remoteRelay.subscribeNotify((e: RelayNotifyEvent) => {
      if (e.type === 'ready') {
        setToast({
          key: Date.now(),
          message: `Relay: using ${e.serverLabel}`,
        })
        return
      }
      setToast({
        key: Date.now(),
        message: `Switched relay server → ${e.serverLabel}`,
      })
    })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!toast) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[200] flex max-w-[min(92vw,24rem)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-center text-sm text-slate-800 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-100">
        {toast.message}
      </div>
    </div>
  )
}
