/** Scroll container for nested overflow (e.g. site-main-scroll). */
export function getScrollParent (el: HTMLElement): Element | null {
  let parent = el.parentElement
  while (parent && parent !== document.documentElement) {
    const style = getComputedStyle(parent)
    const overflowY = style.overflowY || style.overflow
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

export function scrollToHeadingById (id: string, behavior: ScrollBehavior = 'smooth'): void {
  const headerElm = document.getElementById(id) as HTMLHeadingElement | null
  if (!headerElm) return

  const offset = 24
  const scrollParent = getScrollParent(headerElm)
  if (scrollParent) {
    const rect = headerElm.getBoundingClientRect()
    const parentRect = scrollParent.getBoundingClientRect()
    const top = scrollParent.scrollTop + rect.top - parentRect.top - offset
    scrollParent.scrollTo({ top: Math.max(0, top), behavior })
  } else {
    headerElm.scrollIntoView({ block: 'start', behavior })
  }

  const eventHandler = () => {
    headerElm.classList.remove('text-highlighted')
    headerElm.removeEventListener('animationend', eventHandler)
  }
  headerElm.addEventListener('animationend', eventHandler)
  headerElm.classList.add('text-highlighted')
}
