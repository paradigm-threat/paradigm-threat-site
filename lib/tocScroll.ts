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

export type TocEntry = { id: string; title: string; level: number }

const USED = new Set<string>()

function dedupeId (raw: string): string {
  let id = raw
  if (USED.has(id)) {
    let n = 1
    while (USED.has(`${raw}_${n}`)) n++
    id = `${raw}_${n}`
  }
  USED.add(id)
  return id
}

/**
 * Scan `main article` for headings, assign stable ids, return flat TOC.
 * Matches prior DynamicIndex behavior for `no-index` and id generation.
 */
export function collectArticleTocEntries (): TocEntry[] {
  USED.clear()
  const root = document.querySelector('main article')
  if (!root) return []

  const list = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const out: TocEntry[] = []

  list.forEach((headerElm) => {
    if (headerElm.classList.contains('no-index')) return
    const el = headerElm as HTMLHeadingElement
    let id = el.id
    const textContent = el.textContent ?? ''
    if (!id) {
      id = textContent
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]+/g, '')
    }
    id = dedupeId(id || 'section')
    el.id = id
    const level = parseInt(el.nodeName.substring(1, 2), 10) || 1
    out.push({ id, title: textContent.trim() || id, level })
  })

  return out
}
