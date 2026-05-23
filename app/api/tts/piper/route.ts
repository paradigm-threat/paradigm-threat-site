import { NextResponse } from 'next/server'

/** TTS moved to direct relay Piper endpoints — see `lib/tts/piperClient.ts`. */
export function POST () {
  return NextResponse.json(
    { error: 'TTS proxy removed; configure NEXT_PUBLIC_PIPER_API_URLS and use relay /tts directly.' },
    { status: 410 },
  )
}

export function GET () {
  return NextResponse.json(
    { error: 'TTS proxy removed; configure NEXT_PUBLIC_PIPER_API_URLS and use relay /tts directly.' },
    { status: 410 },
  )
}
