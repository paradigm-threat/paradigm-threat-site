// next.config.js

const path = require('path')

/** Keep in sync with lib/edgeDocumentCache.ts */
const EDGE_DOCUMENT_S_MAXAGE = 86400
const EDGE_DOCUMENT_STALE_WHILE_REVALIDATE = 604800

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Live repro (2026-08-11): CDP Offline→Online on paradigmthreat.net fired
  // performance navigation type=reload and wiped the SPA session. Default true.
  reloadOnOnline: false,
  // Do not patch history.pushState / re-cache documents on every soft nav or
  // "online" event — that amplified stale shells after deploy / mirror switch.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  publicExcludes: ['**/*.pdf'],
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Never cache Vercel telemetry beacons/scripts (Speed Insights + Analytics).
      {
        urlPattern: /^https:\/\/va\.vercel-scripts\.com\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/vitals\.vercel-insights\.com\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/_vercel\/(speed-insights|insights)(\/.*)?$/i,
        handler: 'NetworkOnly',
      },
      // Timeline manifest data (GitLab Pages; revalidate often)
      {
        urlPattern: /^https:\/\/paradigm-threat-timeline-a77fe2\.gitlab\.io\/data\/events\.json(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-timeline-events',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 8, maxAgeSeconds: 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/paradigm-threat-timeline-a77fe2\.gitlab\.io\/index\.json(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-timeline-index',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 8, maxAgeSeconds: 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/files\.paradigmthreat\.net\/index\.json(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-index',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/paradigm-threat-files-69f9dc\.gitlab\.io\/index\.json(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-index-gl',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Prefer network for article bodies so SW SWR cannot sticky-stale MD after
      // Relay tip moves; cache still used when offline / slow.
      {
        urlPattern: /^https:\/\/files\.paradigmthreat\.net\/[^?]+\.(md|mdx)(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-articles',
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/paradigm-threat-files-69f9dc\.gitlab\.io\/[^?]+\.(md|mdx)(\?.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pt-articles-gl',
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /\/wasm\/md2ast\/.+/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'md2ast-wasm',
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/[^/]+\.relaygateway\.net\/[^?]+\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pt-relay-assets',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

/** When 1, article paths rewrite to `/` (see lib/spaDocumentRoutes.ts). Default off in production. */
const SPA_DOCUMENT_ROUTES = process.env.NEXT_PUBLIC_SPA_DOCUMENT_ROUTES === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the local animation package (ESM, needs Next.js compilation)
  transpilePackages: ['paradigm-threat-animation'],
  // output: 'export',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.paradigmthreat.net',
      },
      {
        protocol: 'https',
        hostname: 'paradigm-threat-files-69f9dc.gitlab.io',
      },
      {
        protocol: 'https',
        hostname: 'paradigm-threat-timeline-a77fe2.gitlab.io',
      },
      {
        protocol: 'https',
        hostname: 'gitlab.com',
      },
      {
        protocol: 'https',
        hostname: '**.relaygateway.net',
      },
      {
        protocol: 'https',
        hostname: 'paradigmthreat.net',
      },
    ],
    localPatterns: [
      {
        pathname: '/**',
        search: '?*',
      },
    ],
    unoptimized: true
  },
  // Configure pageExtensions (md/mdx kept for any local content pages)
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Optionally, add any other Next.js config below
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join(__dirname, 'app')]
  },
  async redirects() {
    // Full book text was removed from the files repo (copyright). Old links and caches
    // should land on the in-house summary only.
    const thirdStoryRootToTimeline = [
      {
        source: '/',
        has: [{ type: 'host', value: 'thirdstory.site' }],
        destination: '/timeline?fullscreen=1',
        permanent: false,
      },
      {
        source: '/',
        has: [{ type: 'host', value: 'www.thirdstory.site' }],
        destination: '/timeline?fullscreen=1',
        permanent: false,
      },
    ]
    // Legacy .org apex → pure-Relay park (SSR corpus).
    const orgToPureRelay = [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.paradigmthreat.org' }],
        destination: 'https://relay.paradigmthreat.net/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'paradigmthreat.org' }],
        destination: 'https://relay.paradigmthreat.net/:path*',
        permanent: true,
      },
    ]
    return [
      ...thirdStoryRootToTimeline,
      ...orgToPureRelay,
      {
        source: '/cosmos/mars/investigations/death-on-mars',
        destination: '/cosmos/mars/death-on-mars-analysis',
        permanent: true,
      },
      {
        source: '/cosmos/mars/investigations/death-on-mars.md',
        destination: '/cosmos/mars/death-on-mars-analysis',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    if (!SPA_DOCUMENT_ROUTES) return { beforeFiles: [] }
    // Keep in sync with lib/spaDocumentRoutes.ts SPA_REWRITE_SOURCE
    const spaRewriteSource =
      '/((?!api/|_next/|_vercel/|timeline(?:/|$)|search(?:/|$)|chat(?:/|$)|reply(?:/|$)|submit(?:/|$)|export(?:/|$)|files(?:/|$)|site(?:/|$)|wasm/|robots\\.txt|sitemap\\.xml|favicon\\.ico|manifest\\.json|sw\\.js|swe-worker).*)'
    return {
      beforeFiles: [
        { source: spaRewriteSource, destination: '/' },
      ],
    }
  },
  async headers() {
    const documentCacheControl = `public, s-maxage=${EDGE_DOCUMENT_S_MAXAGE}, stale-while-revalidate=${EDGE_DOCUMENT_STALE_WHILE_REVALIDATE}`
    const documentCacheHeaders = [
      { key: 'Vercel-CDN-Cache-Control', value: documentCacheControl },
      { key: 'CDN-Cache-Control', value: documentCacheControl },
      { key: 'Cache-Control', value: documentCacheControl },
    ]
    const documentHeaderRules = []
    if (SPA_DOCUMENT_ROUTES) {
      documentHeaderRules.push({ source: '/', headers: documentCacheHeaders })
    }
    documentHeaderRules.push(
      {
        source:
          '/((?!api/|_next/|_vercel/|chat(?:/|$)|search(?:/|$)|timeline(?:/|$)|reply(?:/|$)|submit(?:/|$)|export(?:/|$)|site(?:/|$)|robots\\.txt|sitemap\\.xml|favicon\\.ico).*)',
        headers: documentCacheHeaders,
      },
    )
    return [
      ...documentHeaderRules,
      {
        source: '/docs',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/docs/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'screen-wake-lock=*',
          },
        ],
      },
    ]
  },
  webpack(config) {
    // Allow importing .geojson files as JSON (for animation empire-boundaries)
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    })
    return config
  },
}

// Merge PWA wrapper
module.exports = withPWA(nextConfig)
