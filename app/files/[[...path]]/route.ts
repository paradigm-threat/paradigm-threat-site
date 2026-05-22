import { NextResponse } from 'next/server'

/** Legacy Vercel /files proxy removed — return explicit 404 (not catch-all HTML). */
export function GET () {
  return new NextResponse(null, { status: 404 })
}

export function HEAD () {
  return new NextResponse(null, { status: 404 })
}
