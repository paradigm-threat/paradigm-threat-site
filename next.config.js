// next.config.js

const path = require('path')

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  publicExcludes: ['**/*.pdf'],
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
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
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pt-index',
          expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/paradigm-threat-files-69f9dc\.gitlab\.io\/index\.json(\?.*)?$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pt-index-gl',
          expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/files\.paradigmthreat\.net\/[^?]+\.(md|mdx)(\?.*)?$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pt-articles',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/paradigm-threat-files-69f9dc\.gitlab\.io\/[^?]+\.(md|mdx)(\?.*)?$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pt-articles-gl',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
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
    return [
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
  async headers() {
    return [
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
