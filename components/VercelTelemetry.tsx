'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

/**
 * Next.js integrations (not `/react`) so route names are reported to Vercel.
 * Keep this isolated so a client root layout cannot silently fall back.
 */
export function VercelTelemetry() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
