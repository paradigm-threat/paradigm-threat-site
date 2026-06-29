/** Mark index / feed UI blocks that must not contribute sidebar TOC entries. */
export const TOC_IGNORE_ATTR = 'data-toc-ignore'

export function isHeadingExcludedFromToc (el: Element): boolean {
  if (el.classList.contains('no-index')) return true
  return el.closest(`[${TOC_IGNORE_ATTR}]`) != null
}

/** Prefer article body inside main; fall back to main. */
export function findTocScanRoot (): Element | null {
  if (typeof document === 'undefined') return null
  return (
    document.querySelector('main article') ??
    document.querySelector('main')
  )
}
