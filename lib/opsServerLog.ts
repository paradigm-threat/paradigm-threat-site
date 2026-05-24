export type OpsLogKind = 'pt_search' | 'pt_chat' | 'pt_ssr_redirect'

export interface OpsLogPayload {
  kind: OpsLogKind
  route?: string
  event: string
  disabled?: boolean
  durationMs?: number
  entryCount?: number
  error?: string
  pathname?: string
  dest?: string
}

/** Structured line for Vercel Runtime Logs. */
export function logOpsEvent (payload: OpsLogPayload): void {
  console.log(JSON.stringify(payload))
}
