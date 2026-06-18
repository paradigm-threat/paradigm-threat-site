export type FetchProgressStatus = 'start' | 'done'

export type FetchProgressListener = (path: string, status: FetchProgressStatus) => void

let fetchProgressListener: FetchProgressListener | null = null

export function setFetchProgressListener (listener: FetchProgressListener | null): void {
  fetchProgressListener = listener
}

export function reportFetchProgress (path: string, status: FetchProgressStatus): void {
  fetchProgressListener?.(path, status)
}

async function withFetchReport<T> (path: string, fn: () => Promise<T>): Promise<T> {
  reportFetchProgress(path, 'start')
  try {
    return await fn()
  } finally {
    reportFetchProgress(path, 'done')
  }
}

export { withFetchReport }
