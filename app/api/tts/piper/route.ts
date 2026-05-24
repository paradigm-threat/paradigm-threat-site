import { NextResponse } from 'next/server'
import { serverRelayApiDisabledResponse } from '@/lib/serverRelayApiGuard'

/** TTS uses direct relay Piper from the browser — see `lib/tts/piperClient.ts`. */
function ttsRemovedResponse () {
  return NextResponse.json(
    {
      error:
        'TTS proxy removed; configure NEXT_PUBLIC_PIPER_API_URLS and use relay /tts directly.',
    },
    { status: 410 },
  )
}

export function POST () {
  const blocked = serverRelayApiDisabledResponse()
  if (blocked) return blocked
  return ttsRemovedResponse()
}

export function GET () {
  const blocked = serverRelayApiDisabledResponse()
  if (blocked) return blocked
  return ttsRemovedResponse()
}
