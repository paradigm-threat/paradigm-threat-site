import { z } from 'zod'
import { CHAT_CONTENT_MAX, CHAT_USERNAME_MAX } from '@/lib/chat/chatMarkdown'

export const chatSubmissionBodySchema = z.object({
  content: z.string().trim().min(1).max(CHAT_CONTENT_MAX),
  channel: z.string().trim().min(1).max(200),
  username: z.string().trim().min(1).max(CHAT_USERNAME_MAX).optional(),
  author: z.string().trim().min(1).max(CHAT_USERNAME_MAX).optional(),
  is_anonymous: z.boolean().optional().default(true),
  anonymous: z.boolean().optional(),
  source: z.enum(['web', 'mcp', 'webmcp']).optional().default('web'),
})

export type ParsedChatSubmission = {
  channel: string
  content: string
  author?: string
  anonymous: boolean
  source: 'web' | 'mcp' | 'webmcp'
}

export function parseChatSubmissionBody (
  body: unknown,
): { ok: true; data: ParsedChatSubmission } | { ok: false; error: string } {
  const parsed = chatSubmissionBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid chat submission'
    return { ok: false, error: msg }
  }
  const anonymous = parsed.data.is_anonymous === false || parsed.data.anonymous === false
    ? false
    : true
  const author = parsed.data.author ?? parsed.data.username
  return {
    ok: true,
    data: {
      channel: parsed.data.channel,
      content: parsed.data.content,
      author: anonymous ? undefined : (author?.trim() || 'guest'),
      anonymous,
      source: parsed.data.source,
    },
  }
}
