'use client'

import React, { Suspense } from 'react'
import { CatchAllClient } from '@/components/content/CatchAllClient'
import { SuspenseLoader } from '@client'

/** Client-only article shell — no server Relay fetch when relay SSR is disabled. */
export function ClientCatchAllShell () {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <SuspenseLoader />
        </div>
      }
    >
      <CatchAllClient />
    </Suspense>
  )
}
