/** Allowed telemetry kinds for POST /api/client-telemetry (client + server validation). */
export const CLIENT_TELEMETRY_KINDS = [
  'mirror_index_failed',
  'mirror_md_failed',
  'client_error',
  'unhandled_rejection',
  'mdx_client_runtime',
] as const

export type ClientTelemetryKind = (typeof CLIENT_TELEMETRY_KINDS)[number]

/** Payload from browser (pathname only, no query — privacy). */
export interface ClientTelemetryPayload {
  kind: ClientTelemetryKind
  /** Truncated error or context message. */
  message?: string
  /** Location pathname only (e.g. /history/foo). */
  pathname: string
  mirrorPhase?: string
  attemptedHostCount?: number
  /** Short summary of hosts tried (labels only). */
  attemptedHostsSummary?: string
  mirrorResourcePath?: string
  digest?: string
}

export const CLIENT_TELEMETRY_MAX_MESSAGE = 500
export const CLIENT_TELEMETRY_MAX_PATHNAME = 512
export const CLIENT_TELEMETRY_MAX_BODY_BYTES = 4096
export const CLIENT_TELEMETRY_MAX_HOSTS_SUMMARY = 200
export const CLIENT_TELEMETRY_MAX_RESOURCE_PATH = 200
