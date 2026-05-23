import { NextResponse } from 'next/server'

/** Voice list moved to direct relay Piper `/voices` — see `lib/tts/piperClient.ts`. */
export function GET () {
  return NextResponse.json(
    {
      error: 'TTS voices proxy removed; use relay /voices via NEXT_PUBLIC_PIPER_API_URLS.',
      voices: [],
      defaultVoiceId: null,
    },
    { status: 410 },
  )
}
