import { getPrimaryFilesBaseUrl, getPrimaryTimelineBaseUrl } from '@/lib/urlListEnv'
import { flattenFilesIndex, flattenTimelineEntriesForSearch, type IndexedPathEntry } from '@/components/helpers/indexHelper'
import { timelineManifestCacheQuery } from '@/lib/timelineManifestCacheBust'

const FILES_BASE_URL = getPrimaryFilesBaseUrl();

export async function getFilesIndex() {
  const res = await fetch(`${FILES_BASE_URL}/index.json`, { cache: 'no-store' });
  if (!res.ok) return {};
  return res.json() as Promise<any>;
}

/** Files index + timeline events.json merged for search (keywords on both). Returns null if files index.json fails. */
export async function getMergedSearchIndex(): Promise<IndexedPathEntry[] | null> {
  const filesUrl = getPrimaryFilesBaseUrl()
  const timelineUrl = getPrimaryTimelineBaseUrl()
  const q = timelineManifestCacheQuery()
  const [filesRes, eventsRes] = await Promise.all([
    fetch(`${filesUrl}/index.json`, { cache: 'no-store' }),
    fetch(`${timelineUrl}/data/events.json${q}`, { cache: 'no-store' }),
  ])
  if (!filesRes.ok) return null
  let fromFiles: IndexedPathEntry[] = []
  try {
    fromFiles = flattenFilesIndex(await filesRes.json())
  } catch {
    return null
  }
  let fromTimeline: IndexedPathEntry[] = []
  if (eventsRes.ok) {
    try {
      fromTimeline = flattenTimelineEntriesForSearch(await eventsRes.json())
    } catch {
      fromTimeline = []
    }
  }
  return [...fromFiles, ...fromTimeline]
}

export async function getRemoteFile(path: string) {
  const res = await fetch(`${FILES_BASE_URL}/${path}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.text();
}

export function getDirStructure(files: any) {
  if (Array.isArray(files)) {
    const structure: any = {};
    files.forEach(file => {
      if (file.includes('node_modules') || file.startsWith('.')) return;
      const parts = file.split('/');
      if (parts.length <= 1) return; // Skip files in root for nav usually, or handle them

      let current = structure;
      // Walk down to the parent directory of the file
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
    return structure;
  }
  return files; // Already in tree format
}
