import { isMarkdownHubPath } from '@/lib/visitResumeStorage'

export type BottomChromeVariant = 'article-tts' | 'minimal'

/** Article/read routes that mount ArticleTTSOverlay (2+ path segments). */
export function isArticleReadRoute (pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length >= 2
}

/** @deprecated Use isArticleReadRoute — kept for callers during rename. */
export function hasArticleTtsDock (pathname: string): boolean {
  return isArticleReadRoute(pathname)
}

export function getBottomChromeVariant (pathname: string): BottomChromeVariant {
  if (isArticleReadRoute(pathname)) return 'article-tts'
  if (isMarkdownHubPath(pathname)) return 'article-tts'
  return 'minimal'
}

/** Hide legacy FloatingDiv back-to-top when unified bottom chrome is active. */
export function shouldHideLegacyFloatingBackToTop (pathname: string): boolean {
  return getBottomChromeVariant(pathname) === 'article-tts' ||
    getBottomChromeVariant(pathname) === 'minimal'
}

/** True on markdown hub listing pages (`/`, `/book`, …). */
export function isHubRoute (pathname: string): boolean {
  return isMarkdownHubPath(pathname)
}
