import { NextResponse } from 'next/server'

/** Removed sharp /api/image proxy — return explicit 404. */
export function GET () {
  return new NextResponse(null, { status: 404 })
}

export function HEAD () {
  return new NextResponse(null, { status: 404 })
}
