/** Shared copy while site ops flags reduce Vercel compute (see lib/siteOpsFeature.ts). */

export const CHAT_DISABLED_HEADLINE = 'Chat disabled until Relay migration'

export const CHAT_DISABLED_BODY =
  'Community chat is temporarily disabled on paradigmthreat.net until we finish moving to Relay. It will return when the migration is complete.'

/** Legacy server routes only — UI uses client-side index from Relay mirrors. */
export const API_SEARCH_DISABLED_ERROR =
  'This API is disabled; use /search or I’m Feeling Lucky in the browser.'

export const API_CHAT_DISABLED_ERROR =
  'Chat is paused during the Relay transition.'

export const API_SERVER_RELAY_DISABLED_ERROR =
  'Server Relay fetch is disabled during the transition; use the site UI (browser loads from Relay mirrors).'
