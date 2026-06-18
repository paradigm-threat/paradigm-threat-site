import type { ModelContext } from '@mcp-b/webmcp-types'

let captured: boolean | null = null

/**
 * Whether native WebMCP existed before the polyfill runs.
 * Call early on the client — polyfill install must not be used to gate reply assistant.
 */
export function nativeWebMcpAvailableAtLoad (): boolean {
  if (captured !== null) return captured
  if (typeof document === 'undefined') {
    captured = false
    return false
  }
  const doc = document as Document & { modelContext?: ModelContext }
  captured = !!(
    doc.modelContext ||
    (typeof navigator !== 'undefined' && navigator.modelContext)
  )
  return captured
}

/** Reset for unit tests only. */
export function resetNativeWebMcpCaptureForTests (): void {
  captured = null
}
