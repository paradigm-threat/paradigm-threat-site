import { NextRequest, NextResponse } from 'next/server'
import { fetchPiperTtsUpstream, isPiperConfigured } from '@/lib/tts/piperUpstream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PiperRequestBody {
  text: string
  voiceId?: string
  rate?: number
}

export async function POST(req: NextRequest) {
  if (!isPiperConfigured()) {
    return NextResponse.json({ error: 'Piper TTS not configured.' }, { status: 503 })
  }

  let body: PiperRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: 'Missing text.' }, { status: 400 })
  }

  try {
    let upstream: Response
    try {
      upstream = await fetchPiperTtsUpstream({
        text,
        voiceId: body.voiceId,
        rate: body.rate,
      })
    } catch (fetchErr) {
      const isTimeout =
        fetchErr instanceof Error && fetchErr.name === 'TimeoutError'
      const msg = isTimeout
        ? `Piper upstream timed out after 28s (text length: ${text.length})`
        : `Piper upstream unreachable: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
      console.error('[TTS PROXY]', msg)
      return NextResponse.json({ error: msg }, { status: 504 })
    }

    if (!upstream.ok) {
      const errBody = await upstream.text()
      let msg = `Piper server error (${upstream.status})`
      try {
        msg = JSON.parse(errBody).error ?? msg
      } catch {
        /* ignore */
      }
      console.error('[TTS PROXY] upstream error:', upstream.status, msg)
      return NextResponse.json({ error: msg }, { status: upstream.status })
    }

    const audio = await upstream.arrayBuffer()
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/wav',
        'Cache-Control': upstream.headers.get('Cache-Control') ?? 'no-store',
        'X-Cache': upstream.headers.get('X-Cache') ?? 'MISS',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TTS proxy error'
    console.error('[TTS PROXY ERROR]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
