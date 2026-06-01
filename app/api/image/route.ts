import { NextResponse } from 'next/server'

/**
 * Retired sharp proxy — explicit 404 so old bookmarks do not hit the catch-all HTML page.
 * App code must never link here; see components/helpers/imageHelper.ts.
 */
export function GET () {
  return new NextResponse(null, { status: 404 })
}

export function HEAD () {
  return new NextResponse(null, { status: 404 })
}
