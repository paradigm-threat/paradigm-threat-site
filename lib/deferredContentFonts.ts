'use client'

/** Inject deferred content-font CSS after first paint (italic / Franklin / Mono). */
export function loadDeferredContentFonts(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('pt-content-fonts-deferred')) return
  const link = document.createElement('link')
  link.id = 'pt-content-fonts-deferred'
  link.rel = 'stylesheet'
  link.href = '/fonts/content-fonts-deferred.css'
  document.head.appendChild(link)
}

export function scheduleDeferredContentFonts(): void {
  if (typeof window === 'undefined') return
  const run = () => loadDeferredContentFonts()
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => run(), { timeout: 2500 })
  } else {
    window.setTimeout(run, 1)
  }
}
