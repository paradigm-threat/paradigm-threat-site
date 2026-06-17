import type { ModelContext } from '@mcp-b/webmcp-types'

/** Prefer document.modelContext (Chrome 150+); fall back to navigator alias. */
export function getModelContext (): ModelContext | null {
  if (typeof document === 'undefined') return null
  const doc = document as Document & { modelContext?: ModelContext }
  if (doc.modelContext) return doc.modelContext
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext
  }
  return null
}

export function hasNativeModelContext (): boolean {
  if (typeof document === 'undefined') return false
  const doc = document as Document & { modelContext?: ModelContext }
  return !!(doc.modelContext || (typeof navigator !== 'undefined' && navigator.modelContext))
}
