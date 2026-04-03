/**
 * localStorage keys for "resume investigation" / "resume playback" on the home hubs.
 * `pt-last-read-path` is also read by PwaRedirect (`?pwa=1`).
 */

export const LS_LAST_PATH = 'pt-last-read-path'
export const LS_LAST_TITLE = 'pt-last-read-title'
export const LS_TTS_RESUME = 'pt-tts-resume-v1'

export type TtsResumeKind = 'article'

export type TtsResumePayload = {
  kind: TtsResumeKind
  /** Normalized pathname, e.g. /influence/censorship/github-ban */
  path: string
  segmentIndex: number
  sentenceIndex: number
  title?: string
  updated: number
}

export function shouldPersistVisit(pathname: string | null | undefined): boolean {
  if (!pathname || pathname === '/' || pathname === '/book') return false
  if (pathname.startsWith('/chat')) return false
  if (pathname === '/search' || pathname.startsWith('/search/')) return false
  return true
}

export function readLastVisit(): { path: string; title: string | null } | null {
  if (typeof window === 'undefined') return null
  try {
    const path = localStorage.getItem(LS_LAST_PATH)
    if (!path || !shouldPersistVisit(path)) return null
    const title = localStorage.getItem(LS_LAST_TITLE)
    return { path, title: title || null }
  } catch {
    return null
  }
}

export function writeLastVisit(pathname: string, title: string): void {
  if (typeof window === 'undefined') return
  if (!shouldPersistVisit(pathname)) return
  try {
    localStorage.setItem(LS_LAST_PATH, pathname)
    localStorage.setItem(LS_LAST_TITLE, title.slice(0, 200))
  } catch {
    /* quota / private mode */
  }
}

export function readTtsResume(): TtsResumePayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_TTS_RESUME)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<TtsResumePayload>
    if (o.kind !== 'article' || typeof o.path !== 'string' || !shouldPersistVisit(o.path)) return null
    const sentenceIndex = typeof o.sentenceIndex === 'number' ? o.sentenceIndex : -1
    if (sentenceIndex < 0) return null
    const segmentIndex = typeof o.segmentIndex === 'number' ? o.segmentIndex : 0
    const updated = typeof o.updated === 'number' ? o.updated : 0
    return {
      kind: 'article',
      path: o.path,
      segmentIndex,
      sentenceIndex,
      title: typeof o.title === 'string' ? o.title : undefined,
      updated,
    }
  } catch {
    return null
  }
}

export function writeTtsResume(payload: Omit<TtsResumePayload, 'updated'> & { updated?: number }): void {
  if (typeof window === 'undefined') return
  if (!shouldPersistVisit(payload.path)) return
  try {
    const full: TtsResumePayload = {
      ...payload,
      kind: 'article',
      updated: payload.updated ?? Date.now(),
    }
    localStorage.setItem(LS_TTS_RESUME, JSON.stringify(full))
  } catch {
    /* quota */
  }
}

export function clearTtsResume(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(LS_TTS_RESUME)
  } catch {
    /* ignore */
  }
}
