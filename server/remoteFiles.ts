import { flattenFilesIndex, flattenTimelineEntriesForSearch, type IndexedPathEntry } from '@/components/helpers/indexHelper'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { fetchTimelineEventsResponse } from '@/lib/serverTimelineMirror'
import { fetchFilesTextFromMirrors } from '@/lib/serverFilesMirror'

export async function getFilesIndex () {
  const res = await fetchFromAssetMirrors('files', '/index.json')
  if (!res?.ok) return {}
  return res.json() as Promise<any>
}

/** Files index + timeline events.json merged for search (keywords on both). Returns null if files index.json fails. */
export async function getMergedSearchIndex (): Promise<IndexedPathEntry[] | null> {
  const [filesRes, eventsRes] = await Promise.all([
    fetchFromAssetMirrors('files', '/index.json'),
    fetchTimelineEventsResponse({ next: { revalidate: 60 } }),
  ])
  if (!filesRes?.ok) return null
  let fromFiles: IndexedPathEntry[] = []
  try {
    fromFiles = flattenFilesIndex(await filesRes.json())
  } catch {
    return null
  }
  let fromTimeline: IndexedPathEntry[] = []
  if (eventsRes?.ok) {
    try {
      fromTimeline = flattenTimelineEntriesForSearch(await eventsRes.json())
    } catch {
      fromTimeline = []
    }
  }
  return [...fromFiles, ...fromTimeline]
}

export async function getRemoteFile (path: string) {
  return fetchFilesTextFromMirrors(path, '')
}

export function getDirStructure (files: any) {
  if (Array.isArray(files)) {
    const structure: any = {}
    files.forEach(file => {
      if (file.includes('node_modules') || file.startsWith('.')) return
      const parts = file.split('/')
      if (parts.length <= 1) return // Skip files in root for nav usually, or handle them

      let current = structure
      // Walk down to the parent directory of the file
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part]) current[part] = {}
        current = current[part]
      }
    })
    return structure
  }
  return files // Already in tree format
}
