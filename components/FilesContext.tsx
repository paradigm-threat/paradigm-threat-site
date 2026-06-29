'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useSyncExternalStore,
} from 'react'
import { remoteRelay } from '@/lib/remoteRelayStore'
import { sendClientTelemetry } from '@/lib/clientTelemetrySend'
import { getFilesBaseUrlList } from '@/lib/urlListEnv'
import { prefetchSiteClaims } from '@/lib/siteAi/siteClaimsStore'

interface FilesContextType {
  fileList: any
  loading: boolean
  error: string | null
  retryLoadIndex: () => void
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const [fileList, setFileList] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const filesUrl = useSyncExternalStore(
    (cb) => remoteRelay.subscribe(cb),
    () => remoteRelay.getSnapshot().filesBaseUrl,
    () => remoteRelay.getSnapshot().filesBaseUrl,
  )

  const retryLoadIndex = useCallback(() => {
    setRetryKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const run = async () => {
      if (!isMounted) return
      setLoading(true)
      setError(null)
      try {
        await remoteRelay.bootstrap()
        if (!isMounted) return
        const data = await remoteRelay.fetchIndexJson(abortController.signal)
        if (!isMounted) return
        void prefetchSiteClaims(abortController.signal)
        if (data == null) {
          setFileList(null)
          setError(
            'Could not load the file index from any relay mirror (timeout or network error). Use Retry or check your connection.',
          )
          setLoading(false)
          const snap = remoteRelay.getSnapshot()
          sendClientTelemetry({
            kind: 'mirror_index_failed',
            mirrorPhase: 'index_json',
            message: 'fetchIndexJson returned null (all relay pairs failed or non-OK)',
            attemptedHostCount: getFilesBaseUrlList().length,
            attemptedHostsSummary: snap.serverLabel || snap.filesHostLabel || undefined,
          })
          return
        }
        setFileList(data)
        setError(null)
        setLoading(false)
      } catch (err: unknown) {
        if (!isMounted) return
        const name = err instanceof Error ? err.name : ''
        if (name === 'AbortError') {
          setFileList(null)
          setError('File index load was cancelled.')
        } else {
          setFileList(null)
          setError(err instanceof Error ? err.message : 'Failed to load file index')
          const snap = remoteRelay.getSnapshot()
          sendClientTelemetry({
            kind: 'mirror_index_failed',
            mirrorPhase: 'index_json',
            message: err instanceof Error ? err.message : 'Failed to load file index',
            attemptedHostCount: getFilesBaseUrlList().length,
            attemptedHostsSummary: snap.serverLabel || snap.filesHostLabel || undefined,
          })
        }
        setLoading(false)
      }
    }

    void run()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [retryKey, filesUrl])

  const contextValue = useMemo(
    () => ({ fileList, loading, error, retryLoadIndex }),
    [fileList, loading, error, retryLoadIndex],
  )

  return <FilesContext.Provider value={contextValue}>{children}</FilesContext.Provider>
}

export function useFiles() {
  const context = useContext(FilesContext)
  if (context === undefined) {
    throw new Error('useFiles must be used within a FilesProvider')
  }
  return context
}
