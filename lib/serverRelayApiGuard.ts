import { NextResponse } from 'next/server'
import { isServerRelayFetchDisabled } from '@/lib/siteOpsFeature'
import { API_SERVER_RELAY_DISABLED_ERROR } from '@/lib/siteOpsMessages'

/** 503 when Vercel must not fetch Relay (Fast Origin Transfer / compute). */
export function serverRelayApiDisabledResponse (): NextResponse | null {
  if (!isServerRelayFetchDisabled()) return null
  return NextResponse.json(
    { error: API_SERVER_RELAY_DISABLED_ERROR, disabled: true },
    { status: 503 },
  )
}
