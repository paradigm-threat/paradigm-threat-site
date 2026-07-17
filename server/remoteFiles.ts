import { getPrimaryFilesBaseUrl } from '@/lib/urlListEnv'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { queryFilesCatalogTree, queryMergedSearchIndex } from '@/lib/queryCatalogFetch'

const FILES_BASE_URL = getPrimaryFilesBaseUrl()

export async function getFilesIndex () {
  return (await queryFilesCatalogTree(FILES_BASE_URL)) ?? {}
}

/** Files + timeline catalogs via QUERY. Returns null if files QUERY fails. */
export async function getMergedSearchIndex (): Promise<IndexedPathEntry[] | null> {
  return queryMergedSearchIndex()
}

export async function getRemoteFile (path: string) {
  const res = await fetch(`${FILES_BASE_URL}/${path}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.text()
}

export function getDirStructure (files: any) {
  if (Array.isArray(files)) {
    const structure: any = {}
    files.forEach((file) => {
      if (file.includes('node_modules') || file.startsWith('.')) return
      const parts = file.split('/')
      if (parts.length <= 1) return

      let current = structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part]) current[part] = {}
        current = current[part]
      }
    })
    return structure
  }
  return files
}
