/**
 * Paths eligible for temporary SSR→files-mirror 307 (see middleware.ts).
 * Used when NEXT_PUBLIC_SSR_MIRROR_REDIRECT=1 and the client is a known crawler bot.
 */

const EXCLUDED_PREFIXES = [
  '/_next',
  '/api',
  '/timeline',
  '/chat',
  '/search',
  '/export',
  '/files',
  '/site',
  '/submit',
]

const EXCLUDED_EXACT = new Set(['/robots.txt', '/sitemap.xml', '/favicon.ico', '/manifest.json'])

/** Extensions handled by raster middleware or non-article static leaves. */
const STATIC_ASSET_EXT =
  /\.(apng|png|jpe?g|gif|webp|avif|bmp|ico|svg|pdf|woff2?|ttf|eot|mp4|webm|txt|cs|md|mdx)$/i

/**
 * Map a pretty site path to the files-repo path Relay serves as HTML (md2ast / SSR).
 * Extensionless article URLs use `<slug>.md`; root uses `page.md`.
 */
export function sitePathToMirrorHtmlRel (pathname: string): string {
  if (!pathname || pathname === '/') return 'page.md'
  const rel = pathname.replace(/^\//, '')
  const segment = rel.split('/').filter(Boolean).pop() || ''
  if (/\.(md|mdx|txt|cs)$/i.test(segment)) return rel
  return `${rel}.md`
}

export function shouldRedirectPathToFilesMirror (pathname: string): boolean {
  if (!pathname || pathname === '/') return true
  if (EXCLUDED_EXACT.has(pathname)) return false
  for (const prefix of EXCLUDED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return false
  }
  const segment = pathname.split('/').filter(Boolean).pop() || ''
  if (STATIC_ASSET_EXT.test(segment)) return false
  return true
}

/** Known social / search crawlers that need SSR HTML head tags (not the Next SPA stub). */
const SEO_BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|Baiduspider|DuckDuckBot|Applebot|YandexBot|SemrushBot|AhrefsBot|Bytespider|PetalBot|meta-externalagent/i

export function isSeoCrawlerUserAgent (ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return false
  return SEO_BOT_UA.test(ua)
}
