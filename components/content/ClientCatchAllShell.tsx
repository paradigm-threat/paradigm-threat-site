'use client'

import React, { Suspense } from 'react'
import { CatchAllClient } from '@/components/content/CatchAllClient'
import { CatchAllPageSkeleton } from '@/components/content/CatchAllPageSkeleton'

/** Client-only article shell — no server Relay fetch when relay SSR is disabled. */
export function ClientCatchAllShell () {
  return (
    <Suspense fallback={<CatchAllPageSkeleton />}>
      <CatchAllClient />
    </Suspense>
  )
}
