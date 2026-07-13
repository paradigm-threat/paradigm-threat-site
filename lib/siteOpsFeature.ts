/** Vercel ops flags — set `NEXT_PUBLIC_*=1` in Production to enable. */

/**
 * When true (default), no server→Relay fetches: article SSR, sitemap index walk,
 * timeline metadata, /api/timeline-json, /api/tts/piper. Set `NEXT_PUBLIC_SERVER_RELAY_FETCH=1` to re-enable.
 */
export function isServerRelayFetchDisabled (): boolean {
  return process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH !== '1'
}

/** Blocks /api/search-index and /api/feeling-lucky only (not the /search UI). */
export function isSearchServerApiDisabled (): boolean {
  return process.env.NEXT_PUBLIC_SEARCH_DISABLED === '1'
}

/** @deprecated Use isSearchServerApiDisabled for APIs; search UI is always client-side. */
export function isSearchDisabled (): boolean {
  return isSearchServerApiDisabled()
}

/** @deprecated Chat uses Relay directly; flag unused — kept for e2e transition only. */
export function isChatDisabled (): boolean {
  return process.env.NEXT_PUBLIC_CHAT_DISABLED === '1'
}

/** WebMCP tool registration (client-only). Default off — site works normally when disabled. */
export function isWebMcpEnabled (): boolean {
  return process.env.NEXT_PUBLIC_WEBMCP_ENABLED === '1'
}

/** Dev only: force strict polyfill even when native document.modelContext exists. */
export function isWebMcpPolyfillForced (): boolean {
  return process.env.NEXT_PUBLIC_WEBMCP_POLYFILL === '1'
}

/** Tier 3 actuation tools (clipboard write, etc.). Default off. */
export function isWebMcpActuationEnabled (): boolean {
  return process.env.NEXT_PUBLIC_WEBMCP_ACTUATION === '1'
}

/**
 * Reply assistant requires WebMCP tools (env). Actual agent availability is
 * native `document.modelContext` — see `isReplyAssistantAgentAvailable` in the browser.
 */
export function isReplyAssistantFeatureEnabled (): boolean {
  return isWebMcpEnabled()
}

/** On-device site AI chat (Prompt API + WebMCP tools). Default off with WebMCP. */
export function isSiteAiEnabled (): boolean {
  return isWebMcpEnabled()
}

/** Public investigation idea submissions (Postgres). Default on unless explicitly disabled. */
export function isInvestigationSubmitEnabled (): boolean {
  return process.env.NEXT_PUBLIC_INVESTIGATION_SUBMIT !== '0'
}

/** Server MCP at /api/mcp (Streamable HTTP). Default off — set MCP_SERVER_ENABLED=1 on Vercel. */
export function isMcpServerEnabled (): boolean {
  return process.env.MCP_SERVER_ENABLED === '1'
}

/**
 * Reserved for a future Relay-hosted HTML + SEO phase. Must stay off while articles
 * use the Next app shell — redirecting to mirror md2ast HTML breaks client components.
 */
export function isSsrMirrorRedirectEnabled (): boolean {
  return false
}

/**
 * Interim SPA: rewrite article/hub paths to `/` (one cached shell, no per-path route).
 * Default off — keeps `[[...slug]]` + server `generateMetadata` (social previews).
 * Set `NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1` and redeploy if edge quota is critical.
 */
export function isSpaDocumentRoutesEnabled (): boolean {
  return process.env.NEXT_PUBLIC_SPA_DOCUMENT_ROUTES === '1'
}
