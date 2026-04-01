import { NextResponse } from 'next/server'
import { aggregatePiperVoices, isPiperConfigured } from '@/lib/tts/piperUpstream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
    if (!isPiperConfigured()) {
        return NextResponse.json({ voices: [], defaultVoiceId: null })
    }

    try {
        const { voices, defaultVoiceId } = await aggregatePiperVoices()
        return NextResponse.json({ voices, defaultVoiceId })
    } catch (err) {
        console.error('[TTS VOICES]', err instanceof Error ? err.message : err)
        return NextResponse.json({ voices: [], defaultVoiceId: null })
    }
}
