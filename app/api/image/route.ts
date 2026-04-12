import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'

/** Detect SVG so we skip sharp (raster/WebP breaks text/fonts in timeline SVGs). */
function isSvgResponse (pathParam: string, contentType: string | null): boolean {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('image/svg+xml')) return true
  const withoutQuery = pathParam.split('?')[0].toLowerCase()
  if (withoutQuery.endsWith('.svg')) return true
  if (pathParam.startsWith('http')) {
    try {
      return new URL(pathParam).pathname.toLowerCase().endsWith('.svg')
    } catch {
      return false
    }
  }
  return false
}

export async function GET (request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get('path')
  const width = searchParams.get('w')

  if (!path) {
    return new NextResponse('Missing path', { status: 400 })
  }

  let response: Response | null = null
  let fetchUrl = ''

  if (path.startsWith('http')) {
    fetchUrl = path
    try {
      const parsedUrl = new URL(path)
      const whitelistedDomains = [
        'files.paradigmthreat.net',
        'paradigmthreat.net',
        'relaygateway.net',
        'gitlab.com',
        'paradigm-threat-files-69f9dc.gitlab.io',
        'localhost',
        '127.0.0.1',
      ]
      const isWhitelisted =
        whitelistedDomains.some(
          (domain) =>
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain),
        ) ||
        parsedUrl.hostname.endsWith('.gitlab.io') ||
        parsedUrl.hostname === 'relaygateway.net' ||
        parsedUrl.hostname.endsWith('.relaygateway.net')

      if (!isWhitelisted) {
        return new NextResponse(`Domain ${parsedUrl.hostname} is not whitelisted`, { status: 403 })
      }
    } catch {
      return new NextResponse(`Invalid URL: ${path}`, { status: 400 })
    }
    response = await fetch(fetchUrl)
  } else {
    const rel = path.replace(/^\//, '')
    const pathname = '/' + rel.split('?')[0]
    const search = path.includes('?') ? '?' + path.split('?').slice(1).join('?') : ''
    response = await fetchFromAssetMirrors('files', pathname, { search })
    fetchUrl = path
  }

  if (!response?.ok) {
    return new NextResponse(
      `Error fetching image: ${response?.statusText ?? 'no mirror'} (${fetchUrl})`,
      { status: response?.status ?? 502 },
    )
  }

  try {
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const upstreamType = response.headers.get('content-type')
    if (isSvgResponse(path, upstreamType)) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    let transformer = sharp(buffer)

    if (width) {
      const w = parseInt(width, 10)
      if (!isNaN(w)) {
        transformer = transformer.resize(w)
      }
    }

    const optimized = await transformer.webp({ quality: 80 }).toBuffer()

    return new NextResponse(new Uint8Array(optimized), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Image optimization error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
