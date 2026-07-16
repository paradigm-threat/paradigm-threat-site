/** Shared copy for site ops flags (see lib/siteOpsFeature.ts). */

export const CHAT_DISABLED_HEADLINE = 'Chat is temporarily disabled'

export const CHAT_DISABLED_BODY =
  'Community chat is turned off on this deployment. Unset NEXT_PUBLIC_CHAT_DISABLED to restore Relay-backed chat.'

/** Legacy server routes only — UI uses client-side index from Relay mirrors. */
export const API_SEARCH_DISABLED_ERROR =
  'This API is disabled; use /search or I’m Feeling Lucky in the browser.'

export const API_CHAT_DISABLED_ERROR =
  'Chat is disabled (NEXT_PUBLIC_CHAT_DISABLED=1).'

export const API_SERVER_RELAY_DISABLED_ERROR =
  'Server Relay fetch is disabled during the transition; use the site UI (browser loads from Relay mirrors).'
