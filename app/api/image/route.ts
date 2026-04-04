import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv';

/** Detect SVG so we skip sharp (raster/WebP breaks text/fonts in timeline SVGs). */
function isSvgResponse(pathParam: string, contentType: string | null): boolean {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('image/svg+xml')) return true;
    const withoutQuery = pathParam.split('?')[0].toLowerCase();
    if (withoutQuery.endsWith('.svg')) return true;
    if (pathParam.startsWith('http')) {
        try {
            return new URL(pathParam).pathname.toLowerCase().endsWith('.svg');
        } catch {
            return false;
        }
    }
    return false;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const width = searchParams.get('w');

    if (!path) {
        return new NextResponse('Missing path', { status: 400 });
    }

    // The image sources are all remote (fetch from files mirror or direct URL)
    const filesBaseUrl = getPrimaryFilesBaseUrl();

    // Ensure path is treated as an absolute path from the files base URL root if it's not a full URL
    const url = path.startsWith('http')
        ? path
        : `${filesBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

    // Security check: only allow whitelisted domains
    if (url.startsWith('http')) {
        try {
            const parsedUrl = new URL(url);
            const whitelistedDomains = [
                'files.paradigmthreat.net',
                'paradigmthreat.net',
                'relaygateway.net',
                'gitlab.com',
                'paradigm-threat-files-69f9dc.gitlab.io',
                'localhost',
                '127.0.0.1',
            ];
            const isWhitelisted =
                whitelistedDomains.some(
                    domain =>
                        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
                ) ||
                parsedUrl.hostname.endsWith('.gitlab.io') ||
                parsedUrl.hostname === 'relaygateway.net' ||
                parsedUrl.hostname.endsWith('.relaygateway.net');

            if (!isWhitelisted) {
                return new NextResponse(`Domain ${parsedUrl.hostname} is not whitelisted`, { status: 403 });
            }
        } catch (e) {
            return new NextResponse(`Invalid URL: ${url}`, { status: 400 });
        }
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return new NextResponse(`Error fetching image: ${response.statusText} (${url})`, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const upstreamType = response.headers.get('content-type');
        if (isSvgResponse(path, upstreamType)) {
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': 'image/svg+xml; charset=utf-8',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        }

        let transformer = sharp(buffer);

        if (width) {
            const w = parseInt(width, 10);
            if (!isNaN(w)) {
                transformer = transformer.resize(w);
            }
        }

        const optimized = await transformer
            .webp({ quality: 80 })
            .toBuffer();

        return new NextResponse(new Uint8Array(optimized), {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Image optimization error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
