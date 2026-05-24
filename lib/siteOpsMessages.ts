/** Shared copy while site ops flags reduce Vercel compute (see lib/siteOpsFeature.ts). */

export const RELAY_TRANSITION_HEADLINE =
  'Community chat temporarily paused'

export const RELAY_TRANSITION_BODY =
  'Community chat is off on paradigmthreat.net while we finish the Relay migration.'

export const CHAT_DISABLED_HEADLINE = 'Chat paused during Relay transition'

export const CHAT_DISABLED_BODY =
  'Community chat is temporarily off on paradigmthreat.net while we finish the Relay migration. It will return when chat is re-enabled on this domain.'

/** Legacy server routes only — UI uses client-side index from Relay mirrors. */
export const API_SEARCH_DISABLED_ERROR =
  'This API is disabled; use /search or I’m Feeling Lucky in the browser.'

export const API_CHAT_DISABLED_ERROR =
  'Chat is paused during the Relay transition.'
