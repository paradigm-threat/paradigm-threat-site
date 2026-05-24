import getCORSHeaders from '@/app/api/cors'
import { isChatDisabled } from '@/lib/siteOpsFeature'
import { logOpsEvent } from '@/lib/opsServerLog'
import { API_CHAT_DISABLED_ERROR } from '@/lib/siteOpsMessages'

export function chatDisabledResponse (req: Request, route: string): Response | null {
  if (!isChatDisabled()) return null
  logOpsEvent({ kind: 'pt_chat', route, event: 'blocked', disabled: true })
  return Response.json(
    { error: API_CHAT_DISABLED_ERROR, disabled: true },
    { status: 503, headers: getCORSHeaders(req) },
  )
}
