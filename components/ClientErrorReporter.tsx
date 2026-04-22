'use client'

import { useEffect } from 'react'
import { sendClientTelemetry } from '@/lib/clientTelemetrySend'

function pathnameOnly (): string {
  try {
    const p = window.location.pathname || '/'
    return p.length > 512 ? p.slice(0, 512) : p
  } catch {
    return '/'
  }
}

/**
 * Reports window `error` and `unhandledrejection` to /api/client-telemetry (throttled server-side pattern).
 */
export function ClientErrorReporter () {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      const msg =
        ev.error instanceof Error
          ? ev.error.message
          : typeof ev.message === 'string'
            ? ev.message
            : 'error'
      sendClientTelemetry({
        kind: 'client_error',
        pathname: pathnameOnly(),
        message: msg.slice(0, 500),
        digest: typeof (ev.error as Error)?.name === 'string' ? (ev.error as Error).name : undefined,
      })
    }

    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'unhandledrejection'
      sendClientTelemetry({
        kind: 'unhandled_rejection',
        pathname: pathnameOnly(),
        message: String(msg).slice(0, 500),
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
